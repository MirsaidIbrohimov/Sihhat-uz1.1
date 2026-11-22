package uz.sihhat.sihhat_mobile

import android.app.job.JobParameters
import android.app.job.JobService
import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class NotificationSyncJobService : JobService() {
    companion object {
        private const val TAG = "SihhatPush"
        const val CHANNEL_ID = NotificationHelper.CHANNEL_ID
        const val PREFS_NAME = NotificationHelper.PREFS_NAME
        const val KEY_BASE_URL = NotificationHelper.KEY_BASE_URL
        const val KEY_AUTH_TOKEN = NotificationHelper.KEY_AUTH_TOKEN
        const val KEY_LAST_NOTIF_ID = NotificationHelper.KEY_LAST_NOTIF_ID
        const val KEY_LAST_UPDATE_BUILD_NOTIFIED = NotificationHelper.KEY_LAST_UPDATE_BUILD_NOTIFIED

        fun syncNow(context: Context) {
            val appContext = context.applicationContext
            val prefs = NotificationHelper.prefs(appContext)
            val baseUrl = prefs.getString(KEY_BASE_URL, null) ?: return
            val installedBuild = NotificationHelper.getInstalledVersionCode(appContext)

            // Ensure any pending FCM token is synced to backend when network becomes available.
            val fcmToken = prefs.getString(NotificationHelper.KEY_FCM_TOKEN, null)
            val syncedToken = prefs.getString(NotificationHelper.KEY_FCM_TOKEN_SYNCED, null)
            if (!fcmToken.isNullOrBlank() && fcmToken != syncedToken) {
                NotificationHelper.registerFcmTokenWithBackend(appContext, fcmToken)
            }

            try {
                checkAppVersionAndNotify(appContext, prefs, baseUrl, installedBuild)
            } catch (e: Exception) {
                Log.w(TAG, "App version check skipped: ${e.message}")
            }

            val authToken = prefs.getString(KEY_AUTH_TOKEN, null)
            if (authToken.isNullOrBlank()) return

            // Authenticated fetch with automatic refresh-token recovery on 401.
            val response = NotificationHelper.authenticatedRequest(
                context = appContext,
                method = "GET",
                path = "/notifications?limit=10"
            ) ?: return

            if (response.first != 200) {
                Log.w(TAG, "Background notification fetch HTTP ${response.first}")
                return
            }

            val jsonArray = JSONArray(response.second)
            if (jsonArray.length() == 0) return

            val lastSeenId = prefs.getString(KEY_LAST_NOTIF_ID, "")
            val newestId = jsonArray.optJSONObject(0)?.optString("id") ?: lastSeenId
            var posted = 0

            for (i in 0 until jsonArray.length()) {
                val item = jsonArray.optJSONObject(i) ?: continue
                val id = item.optString("id")
                val readAt = item.optString("readAt")

                if (id == lastSeenId) break
                if (readAt.isNotEmpty() && readAt != "null") continue
                if (lastSeenId.isNullOrEmpty() && posted >= 3) break
                if (NotificationHelper.isDuplicateNotification(appContext, id)) continue
                posted++

                val payload = item.optJSONObject("payload") ?: JSONObject()
                val topic = payload.optString("topic")
                if (topic == "app.update") {
                    val targetBuild = payload.optLong("target_build", payload.optLong("build_number", 0L))
                    if (installedBuild > 0L && targetBuild in 1L..installedBuild) {
                        continue
                    }
                    if (targetBuild > prefs.getLong(KEY_LAST_UPDATE_BUILD_NOTIFIED, 0L)) {
                        prefs.edit().putLong(KEY_LAST_UPDATE_BUILD_NOTIFIED, targetBuild).apply()
                    }
                }

                val title = payload.optString("title").ifEmpty {
                    when (topic) {
                        "payment.succeeded" -> "Bron to‘lovi tasdiqlandi"
                        "booking.created" -> "Yangi bron tasdiqlandi"
                        "booking.confirmed" -> "Bron tasdiqlandi"
                        "booking.checked_in" -> "Joylashish qayd etildi"
                        "booking.checked_out" -> "Yashash yakunlandi"
                        "refund.succeeded" -> "Pul qaytarildi"
                        "support.replied" -> "Yordam xizmatidan javob"
                        "message.created" -> "Yangi e’lon va xabar"
                        "app.update" -> "Ilovaning yangi versiyasi mavjud"
                        else -> "Sihhat.uz yangilanishi"
                    }
                }
                val text = payload.optString("summary").ifEmpty {
                    payload.optString("body").ifEmpty {
                        "Sizda yangi bildirishnoma bor."
                    }
                }

                val data = mutableMapOf(
                    "notification_id" to id,
                    "topic" to topic
                )
                payload.optString("booking_id").takeIf { it.isNotBlank() && it != "null" }?.let { data["booking_id"] = it }
                payload.optString("ticket_id").takeIf { it.isNotBlank() && it != "null" }?.let { data["ticket_id"] = it }
                payload.optString("message_id").takeIf { it.isNotBlank() && it != "null" }?.let { data["message_id"] = it }
                payload.optString("download_url").takeIf { it.startsWith("https://") }?.let { data["download_url"] = it }

                NotificationHelper.showNotification(
                    context = appContext,
                    title = title,
                    body = text,
                    data = data,
                    notificationId = id.hashCode()
                )
            }

            if (!newestId.isNullOrEmpty()) {
                prefs.edit().putString(KEY_LAST_NOTIF_ID, newestId).apply()
            }
        }

        private fun checkAppVersionAndNotify(
            context: Context,
            prefs: SharedPreferences,
            baseUrl: String,
            installedBuild: Long
        ) {
            if (installedBuild <= 0L) return
            val endpoint = if (baseUrl.endsWith("/")) {
                "${baseUrl}mobile/app-version?build=$installedBuild"
            } else {
                "$baseUrl/mobile/app-version?build=$installedBuild"
            }
            val url = URL(endpoint)
            val conn = url.openConnection() as HttpURLConnection
            try {
                conn.requestMethod = "GET"
                conn.setRequestProperty("Accept", "application/json")
                conn.setRequestProperty("X-App-Build", installedBuild.toString())
                conn.connectTimeout = 10000
                conn.readTimeout = 15000

                if (conn.responseCode != 200) return

                val body = BufferedReader(InputStreamReader(conn.inputStream)).use { it.readText() }
                val json = JSONObject(body)
                if (!json.optBoolean("available", false)) return
                val remoteBuild = json.optLong("build_number", 0L)
                if (remoteBuild <= installedBuild) return

                val lastNotifiedBuild = prefs.getLong(KEY_LAST_UPDATE_BUILD_NOTIFIED, 0L)
                if (lastNotifiedBuild >= remoteBuild) return

                val remoteVersion = json.optString("version").ifEmpty { remoteBuild.toString() }
                val title = json.optString("title").ifEmpty { "Ilova yangilandi (v$remoteVersion)" }
                val text = json.optString("message").ifEmpty {
                    "Sihhat.uz ilovasining yangi versiyasi chiqdi. Eng so‘nggi versiyani yuklab oling."
                }
                val downloadUrl = json.optString("download_url")

                val data = mutableMapOf(
                    "topic" to "app.update",
                    "route" to "update"
                )
                if (downloadUrl.startsWith("https://")) {
                    data["download_url"] = downloadUrl
                }

                NotificationHelper.showNotification(
                    context = context,
                    title = title,
                    body = text,
                    data = data,
                    notificationId = 900000 + (remoteBuild % 10000).toInt()
                )
                prefs.edit().putLong(KEY_LAST_UPDATE_BUILD_NOTIFIED, remoteBuild).apply()
            } finally {
                conn.disconnect()
            }
        }
    }

    override fun onStartJob(params: JobParameters?): Boolean {
        thread(name = "sihhat-notif-sync-job") {
            try {
                syncNow(applicationContext)
            } catch (e: Exception) {
                Log.w(TAG, "NotificationSyncJobService error: ${e.message}")
            } finally {
                jobFinished(params, false)
            }
        }
        return true
    }

    override fun onStopJob(params: JobParameters?): Boolean = true
}

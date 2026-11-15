package uz.sihhat.sihhat_mobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.job.JobParameters
import android.app.job.JobService
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class NotificationSyncJobService : JobService() {
    companion object {
        const val CHANNEL_ID = "sihhat_notifications"
        const val PREFS_NAME = "sihhat_prefs"
        const val KEY_BASE_URL = "base_url"
        const val KEY_AUTH_TOKEN = "auth_token"
        const val KEY_LAST_NOTIF_ID = "last_seen_notif_id"
        const val KEY_LAST_UPDATE_BUILD_NOTIFIED = "last_update_build_notified"
    }

    override fun onStartJob(params: JobParameters?): Boolean {
        thread {
            try {
                fetchAndNotify()
            } catch (_: Exception) {
            } finally {
                jobFinished(params, false)
            }
        }
        return true
    }

    override fun onStopJob(params: JobParameters?): Boolean {
        return true
    }

    private fun getInstalledVersionCode(): Long {
        return try {
            val info = packageManager.getPackageInfo(packageName, 0)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) info.longVersionCode
            else @Suppress("DEPRECATION") info.versionCode.toLong()
        } catch (_: Exception) {
            0L
        }
    }

    private fun checkAppVersionAndNotify(
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
        conn.requestMethod = "GET"
        conn.setRequestProperty("Accept", "application/json")
        conn.setRequestProperty("X-App-Build", installedBuild.toString())
        conn.connectTimeout = 10000
        conn.readTimeout = 15000

        if (conn.responseCode != 200) {
            conn.disconnect()
            return
        }

        val reader = BufferedReader(InputStreamReader(conn.inputStream))
        val body = reader.readText()
        reader.close()
        conn.disconnect()

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

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        ensureNotificationChannel(notificationManager)

        val clickIntent = if (downloadUrl.startsWith("https://")) {
            Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl)).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
        } else {
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            900000 + (remoteBuild % 10000).toInt(),
            clickIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }

        val notif = builder
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(Notification.BigTextStyle().bigText(text))
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify(900000 + (remoteBuild % 10000).toInt(), notif)
        prefs.edit().putLong(KEY_LAST_UPDATE_BUILD_NOTIFIED, remoteBuild).apply()
    }

    private fun fetchAndNotify() {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val baseUrl = prefs.getString(KEY_BASE_URL, null) ?: return
        val installedBuild = getInstalledVersionCode()
        try {
            checkAppVersionAndNotify(prefs, baseUrl, installedBuild)
        } catch (_: Exception) {}

        val token = prefs.getString(KEY_AUTH_TOKEN, null) ?: return
        if (token.isBlank()) return

        val endpoint = if (baseUrl.endsWith("/")) "${baseUrl}notifications?limit=10" else "$baseUrl/notifications?limit=10"
        val url = URL(endpoint)
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.setRequestProperty("Authorization", "Bearer $token")
        conn.setRequestProperty("Accept", "application/json")
        if (installedBuild > 0L) {
            conn.setRequestProperty("X-App-Build", installedBuild.toString())
        }
        conn.connectTimeout = 10000
        conn.readTimeout = 15000

        if (conn.responseCode != 200) {
            conn.disconnect()
            return
        }

        val reader = BufferedReader(InputStreamReader(conn.inputStream))
        val body = reader.readText()
        reader.close()
        conn.disconnect()

        val jsonArray = JSONArray(body)
        if (jsonArray.length() == 0) return

        val lastSeenId = prefs.getString(KEY_LAST_NOTIF_ID, "")
        var newestId = jsonArray.optJSONObject(0)?.optString("id") ?: lastSeenId
        var posted = 0

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        ensureNotificationChannel(notificationManager)

        for (i in 0 until jsonArray.length()) {
            val item = jsonArray.optJSONObject(i) ?: continue
            val id = item.optString("id")
            val readAt = item.optString("readAt")

            if (id == lastSeenId) break
            if (readAt.isNotEmpty() && readAt != "null") continue
            if (lastSeenId.isNullOrEmpty() && posted >= 3) break
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

            val updateUrl = if (topic == "app.update") payload.optString("download_url") else ""
            val launchIntent = if (updateUrl.startsWith("https://")) {
                Intent(Intent.ACTION_VIEW, Uri.parse(updateUrl)).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
            } else {
                Intent(this, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
            }
            val pendingIntent = PendingIntent.getActivity(
                this,
                id.hashCode(),
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, CHANNEL_ID)
            } else {
                @Suppress("DEPRECATION")
                Notification.Builder(this)
            }

            val notif = builder
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(text)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .build()

            notificationManager.notify(id.hashCode(), notif)
        }

        if (!newestId.isNullOrEmpty()) {
            prefs.edit().putString(KEY_LAST_NOTIF_ID, newestId).apply()
        }
    }

    private fun ensureNotificationChannel(manager: NotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val existing = manager.getNotificationChannel(CHANNEL_ID)
            if (existing == null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "Sihhat.uz Bildirishnomalar",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Bronlar, to‘lovlar va tizim xabarlari"
                    enableVibration(true)
                }
                manager.createNotificationChannel(channel)
            }
        }
    }
}

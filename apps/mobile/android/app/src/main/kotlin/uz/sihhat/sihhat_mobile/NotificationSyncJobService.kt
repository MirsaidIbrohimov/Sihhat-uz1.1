package uz.sihhat.sihhat_mobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.job.JobParameters
import android.app.job.JobService
import android.content.Context
import android.content.Intent
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

    private fun fetchAndNotify() {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val baseUrl = prefs.getString(KEY_BASE_URL, null) ?: return
        val token = prefs.getString(KEY_AUTH_TOKEN, null) ?: return
        if (token.isBlank()) return

        val endpoint = if (baseUrl.endsWith("/")) "${baseUrl}notifications?limit=10" else "$baseUrl/notifications?limit=10"
        val url = URL(endpoint)
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.setRequestProperty("Authorization", "Bearer $token")
        conn.setRequestProperty("Accept", "application/json")
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
            val title = payload.optString("title").ifEmpty {
                when (payload.optString("topic")) {
                    "payment.succeeded" -> "Bron to‘lovi tasdiqlandi"
                    "booking.created" -> "Yangi bron tasdiqlandi"
                    "booking.confirmed" -> "Bron tasdiqlandi"
                    "booking.checked_in" -> "Joylashish qayd etildi"
                    "booking.checked_out" -> "Yashash yakunlandi"
                    "refund.succeeded" -> "Pul qaytarildi"
                    "support.replied" -> "Yordam xizmatidan javob"
                    "message.created" -> "Yangi e’lon va xabar"
                    else -> "Sihhat.uz yangilanishi"
                }
            }
            val text = payload.optString("summary").ifEmpty {
                payload.optString("body").ifEmpty {
                    "Sizda yangi bildirishnoma bor."
                }
            }

            val launchIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
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

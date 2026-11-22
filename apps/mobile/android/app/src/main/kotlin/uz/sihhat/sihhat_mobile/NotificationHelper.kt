package uz.sihhat.sihhat_mobile

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.util.Log
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

object NotificationHelper {
    private const val TAG = "SihhatPush"

    const val CHANNEL_ID = "sihhat_notifications"
    const val CHANNEL_NAME = "Sihhat.uz Bildirishnomalar"
    const val CHANNEL_DESC = "Bronlar, to‘lovlar, murojaatlar va tizim xabarlari"

    const val PREFS_NAME = "sihhat_prefs"
    const val KEY_BASE_URL = "base_url"
    const val KEY_AUTH_TOKEN = "auth_token"
    const val KEY_REFRESH_TOKEN = "refresh_token"
    const val KEY_NATIVE_TOKENS_UPDATED = "native_tokens_updated"
    const val KEY_FCM_TOKEN = "fcm_token"
    const val KEY_FCM_TOKEN_SYNCED = "fcm_token_synced"
    const val KEY_DEVICE_ID = "device_id"
    const val KEY_LAST_NOTIF_ID = "last_seen_notif_id"
    const val KEY_LAST_UPDATE_BUILD_NOTIFIED = "last_update_build_notified"
    const val KEY_RECENT_PUSH_IDS = "recent_push_ids"

    const val EXTRA_FROM_NOTIFICATION = "sihhat_from_notification"
    const val EXTRA_ROUTE = "sihhat_route"
    const val EXTRA_TOPIC = "sihhat_topic"
    const val EXTRA_BOOKING_ID = "sihhat_booking_id"
    const val EXTRA_TICKET_ID = "sihhat_ticket_id"
    const val EXTRA_MESSAGE_ID = "sihhat_message_id"
    const val EXTRA_NOTIFICATION_ID = "sihhat_notification_id"
    const val EXTRA_DOWNLOAD_URL = "sihhat_download_url"

    private val refreshLock = Any()

    fun prefs(context: Context): SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getOrCreateDeviceId(context: Context): String {
        val p = prefs(context)
        val existing = p.getString(KEY_DEVICE_ID, null)
        if (!existing.isNullOrBlank()) return existing
        val created = UUID.randomUUID().toString()
        p.edit().putString(KEY_DEVICE_ID, created).apply()
        return created
    }

    fun getDeviceLabel(): String {
        val brand = Build.MANUFACTURER?.trim().orEmpty()
        val model = Build.MODEL?.trim().orEmpty()
        val raw = when {
            brand.isEmpty() -> model
            model.startsWith(brand, ignoreCase = true) -> model
            else -> "$brand $model"
        }.trim()
        return if (raw.isEmpty()) "Android" else raw.replaceFirstChar { it.uppercase() }.take(100)
    }

    fun getAppVersionLabel(context: Context): String {
        return try {
            val info = context.packageManager.getPackageInfo(context.packageName, 0)
            val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                info.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                info.versionCode.toLong()
            }
            val versionName = info.versionName ?: "0.0.0"
            "$versionName+$versionCode"
        } catch (_: Exception) {
            "unknown"
        }
    }

    fun getInstalledVersionCode(context: Context): Long {
        return try {
            val info = context.packageManager.getPackageInfo(context.packageName, 0)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) info.longVersionCode
            else @Suppress("DEPRECATION") info.versionCode.toLong()
        } catch (_: Exception) {
            0L
        }
    }

    fun hasNotificationPermission(context: Context): Boolean {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val systemEnabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            manager.areNotificationsEnabled()
        } else {
            true
        }
        val runtimeGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
        return systemEnabled && runtimeGranted
    }

    fun ensureNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val existing = manager.getNotificationChannel(CHANNEL_ID)
            if (existing == null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = CHANNEL_DESC
                    enableVibration(true)
                    enableLights(true)
                    lightColor = Color.parseColor("#00866C")
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    setShowBadge(true)
                }
                manager.createNotificationChannel(channel)
            }
        }
    }

    fun isDuplicateNotification(context: Context, dedupeId: String?): Boolean {
        if (dedupeId.isNullOrBlank()) return false
        val p = prefs(context)
        val raw = p.getString(KEY_RECENT_PUSH_IDS, "") ?: ""
        val ids = raw.split(",").filter { it.isNotBlank() }.toMutableList()
        if (ids.contains(dedupeId)) return true
        ids.add(dedupeId)
        val trimmed = if (ids.size > 40) ids.takeLast(40) else ids
        p.edit().putString(KEY_RECENT_PUSH_IDS, trimmed.joinToString(",")).apply()
        return false
    }

    fun showNotification(
        context: Context,
        title: String,
        body: String,
        data: Map<String, String> = emptyMap(),
        notificationId: Int? = null
    ) {
        ensureNotificationChannel(context)
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val resolvedId = notificationId ?: (
            data["notification_id"]?.hashCode()
                ?: data["message_id"]?.hashCode()
                ?: (System.currentTimeMillis() % 1000000L).toInt()
        )

        val route = data["route"] ?: resolveRouteFromData(data)
        val launchIntent = Intent(context, MainActivity::class.java).apply {
            action = "FLUTTER_NOTIFICATION_CLICK"
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_FROM_NOTIFICATION, true)
            putExtra(EXTRA_ROUTE, route)
            data["topic"]?.let { putExtra(EXTRA_TOPIC, it) }
            data["booking_id"]?.let { putExtra(EXTRA_BOOKING_ID, it) }
            data["ticket_id"]?.let { putExtra(EXTRA_TICKET_ID, it) }
            data["message_id"]?.let { putExtra(EXTRA_MESSAGE_ID, it) }
            data["notification_id"]?.let { putExtra(EXTRA_NOTIFICATION_ID, it) }
            data["download_url"]?.let { putExtra(EXTRA_DOWNLOAD_URL, it) }
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            resolvedId,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val accentColor = try {
            context.getColor(R.color.sihhat_notification_accent)
        } catch (_: Exception) {
            Color.parseColor("#00866C")
        }

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(context, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(context)
                .setPriority(Notification.PRIORITY_HIGH)
                .setDefaults(Notification.DEFAULT_ALL)
        }

        val cleanTitle = title.ifBlank { "Sihhat.uz" }
        val cleanBody = body.ifBlank { "Sizda yangi bildirishnoma bor." }

        val notif = builder
            .setSmallIcon(R.drawable.ic_stat_sihhat)
            .setColor(accentColor)
            .setContentTitle(cleanTitle)
            .setContentText(cleanBody)
            .setStyle(Notification.BigTextStyle().bigText(cleanBody))
            .setCategory(Notification.CATEGORY_MESSAGE)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setShowWhen(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            manager.notify(resolvedId, notif)
        } catch (e: SecurityException) {
            Log.w(TAG, "POST_NOTIFICATIONS ruxsati berilmagan: ${e.message}")
        }
    }

    private fun resolveRouteFromData(data: Map<String, String>): String {
        val topic = data["topic"] ?: ""
        val downloadUrl = data["download_url"] ?: ""
        if (topic == "app.update" && downloadUrl.startsWith("https://")) return "update"
        if (!data["ticket_id"].isNullOrBlank()) return "support"
        if (!data["booking_id"].isNullOrBlank()) return "booking"
        return "notifications"
    }

    fun extractNotificationRoute(intent: Intent?): Map<String, String>? {
        if (intent == null) return null
        val extras = intent.extras ?: return null

        val fromOurNotif = extras.getBoolean(EXTRA_FROM_NOTIFICATION, false)
        val hasFcmData = extras.containsKey("google.message_id") ||
            extras.containsKey("topic") ||
            extras.containsKey("route") ||
            extras.containsKey("booking_id") ||
            extras.containsKey("ticket_id") ||
            extras.containsKey("message_id") ||
            intent.action == "FLUTTER_NOTIFICATION_CLICK"

        if (!fromOurNotif && !hasFcmData) return null

        val map = mutableMapOf<String, String>()
        fun pick(prefixedKey: String, fcmKey: String, outKey: String) {
            val v = extras.getString(prefixedKey)?.takeIf { it.isNotBlank() }
                ?: extras.getString(fcmKey)?.takeIf { it.isNotBlank() }
            if (v != null) map[outKey] = v
        }

        pick(EXTRA_ROUTE, "route", "route")
        pick(EXTRA_TOPIC, "topic", "topic")
        pick(EXTRA_BOOKING_ID, "booking_id", "booking_id")
        pick(EXTRA_TICKET_ID, "ticket_id", "ticket_id")
        pick(EXTRA_MESSAGE_ID, "message_id", "message_id")
        pick(EXTRA_NOTIFICATION_ID, "notification_id", "notification_id")
        pick(EXTRA_DOWNLOAD_URL, "download_url", "download_url")

        if (!map.containsKey("route")) {
            map["route"] = resolveRouteFromData(map)
        }
        return map
    }

    fun clearNotificationExtras(intent: Intent?) {
        if (intent == null) return
        listOf(
            EXTRA_FROM_NOTIFICATION, EXTRA_ROUTE, EXTRA_TOPIC,
            EXTRA_BOOKING_ID, EXTRA_TICKET_ID, EXTRA_MESSAGE_ID,
            EXTRA_NOTIFICATION_ID, EXTRA_DOWNLOAD_URL,
            "google.message_id", "route", "topic", "booking_id",
            "ticket_id", "message_id", "notification_id", "download_url"
        ).forEach { intent.removeExtra(it) }
    }

    private fun joinUrl(baseUrl: String, path: String): String {
        val cleanBase = baseUrl.trimEnd('/')
        val cleanPath = if (path.startsWith("/")) path else "/$path"
        return "$cleanBase$cleanPath"
    }

    fun refreshSessionTokens(context: Context): String? {
        synchronized(refreshLock) {
            val p = prefs(context)
            val baseUrl = p.getString(KEY_BASE_URL, null)?.takeIf { it.isNotBlank() } ?: return null
            val refreshToken = p.getString(KEY_REFRESH_TOKEN, null)?.takeIf { it.isNotBlank() } ?: return null

            var conn: HttpURLConnection? = null
            try {
                val url = URL(joinUrl(baseUrl, "/auth/refresh"))
                conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("Accept", "application/json")
                    connectTimeout = 10000
                    readTimeout = 15000
                }
                val payload = JSONObject().put("refresh_token", refreshToken).toString()
                OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { it.write(payload) }

                if (conn.responseCode !in 200..299) {
                    Log.w(TAG, "Native token refresh failed: HTTP ${conn.responseCode}")
                    return null
                }
                val body = BufferedReader(InputStreamReader(conn.inputStream)).use { it.readText() }
                val json = JSONObject(body)
                val nextAccess = json.optString("access_token")
                val nextRefresh = json.optString("refresh_token")
                if (nextAccess.isBlank() || nextRefresh.isBlank()) return null

                p.edit()
                    .putString(KEY_AUTH_TOKEN, nextAccess)
                    .putString(KEY_REFRESH_TOKEN, nextRefresh)
                    .putBoolean(KEY_NATIVE_TOKENS_UPDATED, true)
                    .apply()
                Log.i(TAG, "Native background access token muvaffaqiyatli yangilandi")
                return nextAccess
            } catch (e: Exception) {
                Log.w(TAG, "Native token refresh exception: ${e.message}")
                return null
            } finally {
                conn?.disconnect()
            }
        }
    }

    fun authenticatedRequest(
        context: Context,
        method: String,
        path: String,
        jsonBody: JSONObject? = null,
        retryOn401: Boolean = true
    ): Pair<Int, String>? {
        val p = prefs(context)
        val baseUrl = p.getString(KEY_BASE_URL, null)?.takeIf { it.isNotBlank() } ?: return null
        val token = p.getString(KEY_AUTH_TOKEN, null)?.takeIf { it.isNotBlank() } ?: return null
        val installedBuild = getInstalledVersionCode(context)

        var conn: HttpURLConnection? = null
        try {
            val url = URL(joinUrl(baseUrl, path))
            conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = method
                setRequestProperty("Authorization", "Bearer $token")
                setRequestProperty("Accept", "application/json")
                if (installedBuild > 0L) {
                    setRequestProperty("X-App-Build", installedBuild.toString())
                }
                if (jsonBody != null) {
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                }
                connectTimeout = 10000
                readTimeout = 15000
            }
            if (jsonBody != null) {
                OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { it.write(jsonBody.toString()) }
            }
            val code = conn.responseCode
            if (code == 401 && retryOn401) {
                conn.disconnect()
                val refreshed = refreshSessionTokens(context)
                if (!refreshed.isNullOrBlank()) {
                    return authenticatedRequest(context, method, path, jsonBody, retryOn401 = false)
                }
                return 401 to ""
            }
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val body = stream?.let { BufferedReader(InputStreamReader(it)).use { r -> r.readText() } } ?: ""
            return code to body
        } catch (e: Exception) {
            Log.w(TAG, "Background API request ($method $path) failed: ${e.message}")
            return null
        } finally {
            conn?.disconnect()
        }
    }

    fun registerFcmTokenWithBackend(context: Context, token: String): Boolean {
        if (token.length < 16) return false
        val p = prefs(context)
        if (p.getString(KEY_BASE_URL, null).isNullOrBlank() ||
            p.getString(KEY_AUTH_TOKEN, null).isNullOrBlank()
        ) {
            return false
        }
        val body = JSONObject()
            .put("token", token)
            .put("platform", "ANDROID")
            .put("device_id", getOrCreateDeviceId(context))
            .put("device_label", getDeviceLabel())
            .put("app_version", getAppVersionLabel(context))

        val res = authenticatedRequest(context, "POST", "/notifications/device-token", body)
        val ok = res != null && res.first in 200..299
        if (ok) {
            p.edit().putString(KEY_FCM_TOKEN_SYNCED, token).apply()
            Log.i(TAG, "FCM token backendga muvaffaqiyatli saqlandi")
        } else {
            Log.w(TAG, "FCM token backendga yuborilmadi: HTTP ${res?.first}")
        }
        return ok
    }
}

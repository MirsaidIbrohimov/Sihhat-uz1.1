package uz.sihhat.sihhat_mobile

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlin.concurrent.thread

class SihhatFirebaseMessagingService : FirebaseMessagingService() {
    companion object {
        private const val TAG = "SihhatPush"
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        val clean = token.trim()
        if (clean.isEmpty()) return
        val hint = if (clean.length > 14) "${clean.take(8)}...${clean.takeLast(6)}" else "***"
        Log.i(TAG, "Yangi FCM token olindi: $hint")

        NotificationHelper.prefs(applicationContext).edit()
            .putString(NotificationHelper.KEY_FCM_TOKEN, clean)
            .apply()

        // Notify live Flutter engine if running, and always persist directly to backend in background.
        MainActivity.notifyFcmTokenRefreshed(clean)
        thread(name = "sihhat-fcm-token-upload") {
            NotificationHelper.registerFcmTokenWithBackend(applicationContext, clean)
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        val data = HashMap<String, String>(remoteMessage.data)
        val title = remoteMessage.notification?.title
            ?: data["title"]
            ?: "Sihhat.uz"
        val body = remoteMessage.notification?.body
            ?: data["body"]
            ?: "Sizda yangi bildirishnoma bor."

        val dedupeId = data["notification_id"] ?: remoteMessage.messageId
        Log.i(TAG, "FCM xabar qabul qilindi: topic=${data["topic"] ?: "unknown"}")

        // Show system heads-up notification in BOTH foreground and background/data-only states.
        if (!NotificationHelper.isDuplicateNotification(applicationContext, dedupeId)) {
            NotificationHelper.showNotification(
                context = applicationContext,
                title = title,
                body = body,
                data = data
            )
        }

        // Update Flutter UI (unread bell indicator / open notification list) when app is active.
        MainActivity.notifyPushMessageReceived(
            mapOf(
                "title" to title,
                "body" to body,
                "data" to data
            )
        )
    }
}

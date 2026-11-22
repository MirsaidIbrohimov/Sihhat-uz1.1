package uz.sihhat.sihhat_mobile

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import kotlin.concurrent.thread

class BootCompletedReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "SihhatPush"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_MY_PACKAGE_REPLACED &&
            action != "android.intent.action.QUICKBOOT_POWERON" &&
            action != "com.htc.intent.action.QUICKBOOT_POWERON"
        ) {
            return
        }

        Log.i(TAG, "Qurilma qayta ishga tushdi ($action): push kanali va FCM token tiklanmoqda")
        val appContext = context.applicationContext
        NotificationHelper.ensureNotificationChannel(appContext)

        val prefs = NotificationHelper.prefs(appContext)
        val hasBaseUrl = !prefs.getString(NotificationHelper.KEY_BASE_URL, null).isNullOrBlank()
        if (hasBaseUrl) {
            FcmManager.scheduleFallbackSyncJob(appContext)
        }

        val pendingResult = goAsync()
        thread(name = "sihhat-boot-push-sync") {
            try {
                // Re-register FCM token after reboot so backend always has the latest active token.
                val latch = java.util.concurrent.CountDownLatch(1)
                FcmManager.syncTokenInBackground(appContext) { latch.countDown() }
                latch.await(10, java.util.concurrent.TimeUnit.SECONDS)

                // Catch up on any notifications missed while the phone was powered off.
                if (hasBaseUrl) {
                    NotificationSyncJobService.syncNow(appContext)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Boot push sync xatosi: ${e.message}")
            } finally {
                pendingResult.finish()
            }
        }
    }
}

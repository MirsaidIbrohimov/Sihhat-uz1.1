package uz.sihhat.sihhat_mobile

import android.app.job.JobInfo
import android.app.job.JobScheduler
import android.content.ComponentName
import android.content.Context
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import kotlin.concurrent.thread

object FcmManager {
    private const val TAG = "SihhatPush"
    const val NOTIFICATION_JOB_ID = 2001

    fun isFirebaseAvailable(context: Context): Boolean {
        return try {
            val appContext = context.applicationContext
            if (FirebaseApp.getApps(appContext).isNotEmpty()) {
                true
            } else {
                FirebaseApp.initializeApp(appContext) != null
            }
        } catch (e: Throwable) {
            Log.w(TAG, "Firebase hali sozlanmagan (google-services.json kerak): ${e.message}")
            false
        }
    }

    fun fetchToken(context: Context, onComplete: (String?) -> Unit) {
        val appContext = context.applicationContext
        if (!isFirebaseAvailable(appContext)) {
            onComplete(null)
            return
        }
        try {
            val messaging = FirebaseMessaging.getInstance()
            messaging.isAutoInitEnabled = true
            messaging.token.addOnCompleteListener { task ->
                if (!task.isSuccessful) {
                    Log.w(TAG, "FCM token olishda xatolik: ${task.exception?.message}")
                    val cached = NotificationHelper.prefs(appContext)
                        .getString(NotificationHelper.KEY_FCM_TOKEN, null)
                    onComplete(cached)
                    return@addOnCompleteListener
                }
                val token = task.result?.trim()
                if (!token.isNullOrBlank()) {
                    NotificationHelper.prefs(appContext).edit()
                        .putString(NotificationHelper.KEY_FCM_TOKEN, token)
                        .apply()
                    onComplete(token)
                } else {
                    onComplete(null)
                }
            }
        } catch (e: Throwable) {
            Log.w(TAG, "FirebaseMessaging ishga tushmadi: ${e.message}")
            onComplete(null)
        }
    }

    fun syncTokenInBackground(context: Context, onDone: (() -> Unit)? = null) {
        val appContext = context.applicationContext
        fetchToken(appContext) { token ->
            if (!token.isNullOrBlank()) {
                thread(name = "sihhat-fcm-sync") {
                    try {
                        NotificationHelper.registerFcmTokenWithBackend(appContext, token)
                    } finally {
                        onDone?.invoke()
                    }
                }
            } else {
                onDone?.invoke()
            }
        }
    }

    fun scheduleFallbackSyncJob(context: Context) {
        try {
            val appContext = context.applicationContext
            val scheduler = appContext.getSystemService(Context.JOB_SCHEDULER_SERVICE) as JobScheduler
            val component = ComponentName(appContext, NotificationSyncJobService::class.java)
            val builder = JobInfo.Builder(NOTIFICATION_JOB_ID, component)
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(15 * 60 * 1000L)
                .setPersisted(true)
            scheduler.schedule(builder.build())
        } catch (e: Exception) {
            Log.w(TAG, "Fallback JobScheduler rejalashtirishda xato: ${e.message}")
        }
    }

    fun cancelFallbackSyncJob(context: Context) {
        try {
            val scheduler = context.applicationContext
                .getSystemService(Context.JOB_SCHEDULER_SERVICE) as JobScheduler
            scheduler.cancel(NOTIFICATION_JOB_ID)
        } catch (_: Exception) {}
    }
}

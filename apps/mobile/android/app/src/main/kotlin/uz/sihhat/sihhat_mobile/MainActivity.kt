package uz.sihhat.sihhat_mobile

import android.Manifest
import android.app.Activity
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Base64
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel
import java.io.ByteArrayOutputStream
import java.lang.ref.WeakReference

class MainActivity : FlutterActivity() {
    private var callback: ConnectivityManager.NetworkCallback? = null
    private var pendingImageResult: MethodChannel.Result? = null
    private var pendingPermissionResult: MethodChannel.Result? = null
    private var pendingMaxDim: Int = 1280
    private var pendingMaxBytes: Long = DEFAULT_MAX_IMAGE_BYTES
    private var notificationsChannel: MethodChannel? = null
    private var initialNotificationRoute: Map<String, String>? = null

    companion object {
        private const val REQUEST_PICK_IMAGE = 1012
        private const val REQUEST_POST_NOTIFICATIONS = 1013
        private const val DEFAULT_MAX_IMAGE_BYTES = 15L * 1024L * 1024L
        private val mainHandler = Handler(Looper.getMainLooper())
        @Volatile
        private var activeRef: WeakReference<MainActivity>? = null

        fun notifyFcmTokenRefreshed(token: String) {
            mainHandler.post {
                activeRef?.get()?.notificationsChannel?.invokeMethod("onFcmTokenRefresh", token)
            }
        }

        fun notifyPushMessageReceived(payload: Map<String, Any>) {
            mainHandler.post {
                activeRef?.get()?.notificationsChannel?.invokeMethod("onPushMessage", payload)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        activeRef = WeakReference(this)
        NotificationHelper.ensureNotificationChannel(this)
        FcmManager.fetchToken(this) {}
        captureNotificationIntent(intent, deliverImmediately = false)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        captureNotificationIntent(intent, deliverImmediately = true)
    }

    override fun onDestroy() {
        if (activeRef?.get() === this) {
            activeRef = null
        }
        pendingPermissionResult = null
        super.onDestroy()
    }

    private fun captureNotificationIntent(intent: Intent?, deliverImmediately: Boolean) {
        val route = NotificationHelper.extractNotificationRoute(intent) ?: return
        NotificationHelper.clearNotificationExtras(intent)
        if (deliverImmediately && notificationsChannel != null) {
            mainHandler.post {
                notificationsChannel?.invokeMethod("onNotificationTap", route)
            }
        } else {
            initialNotificationRoute = route
        }
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        NotificationHelper.ensureNotificationChannel(this)

        val channel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "uz.sihhat/notifications")
        notificationsChannel = channel

        channel.setMethodCallHandler { call, result ->
            when (call.method) {
                "getAppVersion" -> {
                    try {
                        val info = packageManager.getPackageInfo(packageName, 0)
                        val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                            info.longVersionCode
                        } else {
                            @Suppress("DEPRECATION")
                            info.versionCode.toLong()
                        }
                        result.success(
                            mapOf(
                                "versionName" to (info.versionName ?: ""),
                                "buildNumber" to versionCode
                            )
                        )
                    } catch (_: Exception) {
                        result.success(null)
                    }
                }
                "syncConfig" -> {
                    val baseUrl = call.argument<String>("baseUrl")
                    if (!baseUrl.isNullOrBlank()) {
                        NotificationHelper.prefs(this).edit()
                            .putString(NotificationHelper.KEY_BASE_URL, baseUrl)
                            .apply()
                        FcmManager.scheduleFallbackSyncJob(this)
                    }
                    result.success(true)
                }
                "syncCredentials" -> {
                    val baseUrl = call.argument<String>("baseUrl")
                    val token = call.argument<String>("token")
                    val refreshToken = call.argument<String>("refreshToken")
                    if (!baseUrl.isNullOrBlank() && !token.isNullOrBlank()) {
                        val editor = NotificationHelper.prefs(this).edit()
                            .putString(NotificationHelper.KEY_BASE_URL, baseUrl)
                            .putString(NotificationHelper.KEY_AUTH_TOKEN, token)
                            .putBoolean(NotificationHelper.KEY_NATIVE_TOKENS_UPDATED, false)
                        if (!refreshToken.isNullOrBlank()) {
                            editor.putString(NotificationHelper.KEY_REFRESH_TOKEN, refreshToken)
                        }
                        editor.apply()
                        FcmManager.scheduleFallbackSyncJob(this)
                    }
                    result.success(true)
                }
                "getSyncedCredentials" -> {
                    val prefs = NotificationHelper.prefs(this)
                    val updated = prefs.getBoolean(NotificationHelper.KEY_NATIVE_TOKENS_UPDATED, false)
                    val access = prefs.getString(NotificationHelper.KEY_AUTH_TOKEN, null)
                    val refresh = prefs.getString(NotificationHelper.KEY_REFRESH_TOKEN, null)
                    if (updated) {
                        prefs.edit().putBoolean(NotificationHelper.KEY_NATIVE_TOKENS_UPDATED, false).apply()
                    }
                    result.success(
                        mapOf(
                            "updated" to updated,
                            "accessToken" to access,
                            "refreshToken" to refresh
                        )
                    )
                }
                "clearCredentials" -> {
                    val prefs = NotificationHelper.prefs(this)
                    prefs.edit()
                        .remove(NotificationHelper.KEY_AUTH_TOKEN)
                        .remove(NotificationHelper.KEY_REFRESH_TOKEN)
                        .remove(NotificationHelper.KEY_NATIVE_TOKENS_UPDATED)
                        .remove(NotificationHelper.KEY_LAST_NOTIF_ID)
                        .remove(NotificationHelper.KEY_FCM_TOKEN_SYNCED)
                        .apply()
                    val hasBaseUrl = !prefs.getString(NotificationHelper.KEY_BASE_URL, null).isNullOrBlank()
                    if (hasBaseUrl) {
                        FcmManager.scheduleFallbackSyncJob(this)
                    } else {
                        FcmManager.cancelFallbackSyncJob(this)
                    }
                    result.success(true)
                }
                "getNotificationPermissionStatus" -> {
                    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    val systemEnabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        manager.areNotificationsEnabled()
                    } else {
                        true
                    }
                    val runtimeGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
                    } else {
                        true
                    }
                    result.success(
                        mapOf(
                            "granted" to (runtimeGranted && systemEnabled),
                            "runtimeGranted" to runtimeGranted,
                            "systemEnabled" to systemEnabled,
                            "sdkInt" to Build.VERSION.SDK_INT
                        )
                    )
                }
                "requestNotificationPermission" -> {
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                        result.success(NotificationHelper.hasNotificationPermission(this))
                    } else if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                        result.success(true)
                    } else {
                        pendingPermissionResult?.success(false)
                        pendingPermissionResult = result
                        requestPermissions(
                            arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                            REQUEST_POST_NOTIFICATIONS
                        )
                    }
                }
                "getFcmToken" -> {
                    FcmManager.fetchToken(this) { token ->
                        mainHandler.post { result.success(token) }
                    }
                }
                "getFcmStatus" -> {
                    val firebaseConfigured = FcmManager.isFirebaseAvailable(this)
                    val cachedToken = NotificationHelper.prefs(this)
                        .getString(NotificationHelper.KEY_FCM_TOKEN, null)
                    result.success(
                        mapOf(
                            "firebaseConfigured" to firebaseConfigured,
                            "token" to cachedToken,
                            "deviceId" to NotificationHelper.getOrCreateDeviceId(this),
                            "deviceLabel" to NotificationHelper.getDeviceLabel(),
                            "appVersion" to NotificationHelper.getAppVersionLabel(this)
                        )
                    )
                }
                "markFcmTokenSynced" -> {
                    val synced = call.argument<String>("token")
                    if (!synced.isNullOrBlank()) {
                        NotificationHelper.prefs(this).edit()
                            .putString(NotificationHelper.KEY_FCM_TOKEN_SYNCED, synced)
                            .apply()
                    }
                    result.success(true)
                }
                "getInitialNotificationRoute" -> {
                    val route = initialNotificationRoute
                    initialNotificationRoute = null
                    result.success(route)
                }
                "showNotification" -> {
                    val title = call.argument<String>("title") ?: "Sihhat.uz"
                    val body = call.argument<String>("body") ?: ""
                    @Suppress("UNCHECKED_CAST")
                    val rawData = call.argument<Map<String, Any?>>("data")
                    val data = rawData?.mapNotNull { (k, v) ->
                        v?.toString()?.let { k to it }
                    }?.toMap() ?: emptyMap()
                    NotificationHelper.showNotification(this, title, body, data)
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }

        val manager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        EventChannel(flutterEngine.dartExecutor.binaryMessenger, "uz.sihhat/connectivity")
            .setStreamHandler(object : EventChannel.StreamHandler {
                override fun onListen(arguments: Any?, events: EventChannel.EventSink) {
                    callback?.let { manager.unregisterNetworkCallback(it) }
                    var lastOnline = false
                    val current = manager.getNetworkCapabilities(manager.activeNetwork)
                    events.success(current?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true)
                    val listener = object : ConnectivityManager.NetworkCallback() {
                        override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
                            val online = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                                capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
                            if (online != lastOnline) {
                                lastOnline = online
                                runOnUiThread { events.success(online) }
                            }
                        }
                        override fun onLost(network: Network) {
                            lastOnline = false
                            runOnUiThread { events.success(false) }
                        }
                    }
                    callback = listener
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        manager.registerDefaultNetworkCallback(listener)
                    } else {
                        manager.registerNetworkCallback(NetworkRequest.Builder()
                            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).build(), listener)
                    }
                }
                override fun onCancel(arguments: Any?) {
                    callback?.let { manager.unregisterNetworkCallback(it) }
                    callback = null
                }
            })

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "uz.sihhat/image_picker")
            .setMethodCallHandler { call, result ->
                if (call.method == "pickImage") {
                    pendingImageResult = result
                    pendingMaxDim = call.argument<Int>("maxDim") ?: 1280
                    pendingMaxBytes = (call.argument<Number>("maxBytes")?.toLong()) ?: DEFAULT_MAX_IMAGE_BYTES
                    val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                        type = "image/*"
                        addCategory(Intent.CATEGORY_OPENABLE)
                    }
                    startActivityForResult(intent, REQUEST_PICK_IMAGE)
                } else {
                    result.notImplemented()
                }
            }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_POST_NOTIFICATIONS) {
            val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
            pendingPermissionResult?.success(granted)
            pendingPermissionResult = null
        }
    }

    private fun readUriSize(uri: Uri): Long? {
        return try {
            contentResolver.openAssetFileDescriptor(uri, "r")?.use { fd ->
                val len = fd.length
                if (len > 0) len else null
            }
        } catch (_: Exception) {
            null
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_PICK_IMAGE) {
            val res = pendingImageResult
            val maxDim = pendingMaxDim
            val maxBytes = pendingMaxBytes
            pendingImageResult = null
            if (resultCode == Activity.RESULT_OK && data?.data != null) {
                try {
                    val uri: Uri = data.data!!
                    val size = readUriSize(uri)
                    if (size != null && size > maxBytes) {
                        res?.error("FILE_TOO_LARGE", "Rasm hajmi 15 MB dan oshmasligi kerak", null)
                        return
                    }
                    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                    contentResolver.openInputStream(uri)?.use { stream ->
                        BitmapFactory.decodeStream(stream, null, bounds)
                    }
                    var sample = 1
                    while (bounds.outWidth / sample > maxDim * 2 || bounds.outHeight / sample > maxDim * 2) {
                        sample *= 2
                    }
                    val decodeOpts = BitmapFactory.Options().apply { inSampleSize = sample }
                    val originalBitmap = contentResolver.openInputStream(uri)?.use { stream ->
                        BitmapFactory.decodeStream(stream, null, decodeOpts)
                    }
                    if (originalBitmap != null) {
                        val width = originalBitmap.width
                        val height = originalBitmap.height
                        val scaledBitmap = if (width > maxDim || height > maxDim) {
                            val ratio = width.toFloat() / height.toFloat()
                            val (targetW, targetH) = if (ratio > 1) {
                                maxDim to (maxDim / ratio).toInt().coerceAtLeast(1)
                            } else {
                                (maxDim * ratio).toInt().coerceAtLeast(1) to maxDim
                            }
                            Bitmap.createScaledBitmap(originalBitmap, targetW, targetH, true)
                        } else {
                            originalBitmap
                        }
                        val outStream = ByteArrayOutputStream()
                        scaledBitmap.compress(Bitmap.CompressFormat.JPEG, 84, outStream)
                        val bytes = outStream.toByteArray()
                        if (bytes.size.toLong() > maxBytes) {
                            res?.error("FILE_TOO_LARGE", "Rasm hajmi 15 MB dan oshmasligi kerak", null)
                            return
                        }
                        val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                        res?.success("data:image/jpeg;base64,$base64")
                        return
                    }
                } catch (e: Exception) {
                    res?.error("PICK_ERROR", e.message, null)
                    return
                }
            }
            res?.success(null)
        }
    }

    override fun cleanUpFlutterEngine(flutterEngine: FlutterEngine) {
        val manager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        callback?.let { manager.unregisterNetworkCallback(it) }
        callback = null
        pendingImageResult = null
        pendingPermissionResult = null
        notificationsChannel?.setMethodCallHandler(null)
        notificationsChannel = null
        super.cleanUpFlutterEngine(flutterEngine)
    }
}

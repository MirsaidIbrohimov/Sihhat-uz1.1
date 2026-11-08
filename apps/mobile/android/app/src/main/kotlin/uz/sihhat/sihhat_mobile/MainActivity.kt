package uz.sihhat.sihhat_mobile

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.os.Build
import android.util.Base64
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel
import java.io.ByteArrayOutputStream

class MainActivity : FlutterActivity() {
    private var callback: ConnectivityManager.NetworkCallback? = null
    private var pendingImageResult: MethodChannel.Result? = null

    companion object {
        private const val REQUEST_PICK_IMAGE = 1012
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
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

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_PICK_IMAGE) {
            val res = pendingImageResult
            pendingImageResult = null
            if (resultCode == Activity.RESULT_OK && data?.data != null) {
                try {
                    val uri: Uri = data.data!!
                    val stream = contentResolver.openInputStream(uri)
                    val originalBitmap = BitmapFactory.decodeStream(stream)
                    stream?.close()
                    if (originalBitmap != null) {
                        val maxDim = 1280
                        val width = originalBitmap.width
                        val height = originalBitmap.height
                        val scaledBitmap = if (width > maxDim || height > maxDim) {
                            val ratio = width.toFloat() / height.toFloat()
                            val (targetW, targetH) = if (ratio > 1) {
                                maxDim to (maxDim / ratio).toInt()
                            } else {
                                (maxDim * ratio).toInt() to maxDim
                            }
                            Bitmap.createScaledBitmap(originalBitmap, targetW, targetH, true)
                        } else {
                            originalBitmap
                        }
                        val outStream = ByteArrayOutputStream()
                        scaledBitmap.compress(Bitmap.CompressFormat.JPEG, 82, outStream)
                        val bytes = outStream.toByteArray()
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
        super.cleanUpFlutterEngine(flutterEngine)
    }
}

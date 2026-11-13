package com.example.pinyinchart;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Microphone permission state the WebView cannot report. The WebView itself asks for
 * the permission (Capacitor's BridgeWebChromeClient) when the page starts recording; after
 * a refusal the page calls status() to tell "refused" (Android will ask again) from
 * "refused for good" (only the system settings can change it), and openSettings() to help.
 * Listed under "Native customisations" in docs/ANDROID.md.
 */
@CapacitorPlugin(name = "MicrophonePermission")
public class MicrophonePermissionPlugin extends Plugin {

    @PluginMethod
    public void status(PluginCall call) {
        boolean granted =
            ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        // True only after a refusal that Android will still let the app ask about again.
        boolean canAskAgain = ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), Manifest.permission.RECORD_AUDIO);
        JSObject result = new JSObject();
        result.put("granted", granted);
        result.put("canAskAgain", canAskAgain);
        call.resolve(result);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", getContext().getPackageName(), null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Settings could not be opened", e);
        }
    }
}

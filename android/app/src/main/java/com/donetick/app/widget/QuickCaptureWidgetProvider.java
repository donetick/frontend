package com.donetick.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

import com.donetick.app.R;

/**
 * "Quick Capture" home-screen widget: three shortcuts straight into the
 * add-task flow (type, scan, speak). Purely a launcher — it shows no task
 * data, so it never needs a refresh cycle.
 */
public class QuickCaptureWidgetProvider extends AppWidgetProvider {
    // Handled in src/CapacitorListener.js → /chores?add_task=1[&mode=…]
    private static final String URI_TYPE = "donetick://chores/add";
    private static final String URI_SCAN = "donetick://chores/add?mode=scan";
    private static final String URI_VOICE = "donetick://chores/add?mode=voice";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            manager.updateAppWidget(id, build(context, id));
        }
    }

    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        for (int id : appWidgetIds) WidgetStore.removeWidgetOptions(context, id);
    }

    /** Redraw placed widgets — the opacity setting can change while they sit there. */
    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(
                new android.content.ComponentName(context, QuickCaptureWidgetProvider.class));
        for (int id : ids) manager.updateAppWidget(id, build(context, id));
    }

    private static RemoteViews build(Context context, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_capture);
        views.setOnClickPendingIntent(R.id.quick_type, deepLink(context, 10, URI_TYPE));
        views.setOnClickPendingIntent(R.id.quick_scan, deepLink(context, 11, URI_SCAN));
        views.setOnClickPendingIntent(R.id.quick_voice, deepLink(context, 12, URI_VOICE));

        WidgetTheme theme = WidgetTheme.of(context, appWidgetId);
        theme.applyBackground(context, views, appWidgetId);
        if (theme.isForced()) {
            // The tile shapes and the icon tints both come from themed resources
            // the launcher would otherwise resolve for its own scheme.
            int accent = theme.color(R.color.widget_accent);
            int tile = theme.tileBackground();
            int[] tiles = {R.id.quick_type, R.id.quick_scan, R.id.quick_voice};
            int[] icons = {R.id.quick_type_icon, R.id.quick_scan_icon, R.id.quick_voice_icon};
            int[] labels = {R.id.quick_type_label, R.id.quick_scan_label, R.id.quick_voice_label};
            for (int i = 0; i < tiles.length; i++) {
                views.setInt(tiles[i], "setBackgroundResource", tile);
                views.setInt(icons[i], "setColorFilter", accent);
                views.setTextColor(labels[i], accent);
            }
        }
        return views;
    }

    private static PendingIntent deepLink(Context context, int requestCode, String uri) {
        Intent intent = new Intent(context, com.donetick.app.MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        // Distinct data per tile so the three PendingIntents aren't collapsed.
        intent.setData(Uri.parse(uri));
        return PendingIntent.getActivity(context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}

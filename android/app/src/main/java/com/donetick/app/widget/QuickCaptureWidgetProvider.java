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
            manager.updateAppWidget(id, build(context));
        }
    }

    private static RemoteViews build(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_capture);
        views.setOnClickPendingIntent(R.id.quick_type, deepLink(context, 10, URI_TYPE));
        views.setOnClickPendingIntent(R.id.quick_scan, deepLink(context, 11, URI_SCAN));
        views.setOnClickPendingIntent(R.id.quick_voice, deepLink(context, 12, URI_VOICE));
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

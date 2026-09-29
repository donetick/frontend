package com.donetick.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.RemoteViews;

import com.donetick.app.R;

/**
 * "Quick Actions" widget: four configurable circular buttons in a 2x2 square.
 * Like
 * {@link QuickCaptureWidgetProvider} it shows no task data, so it never needs a
 * refresh cycle.
 */
public class QuickActionsWidgetProvider extends AppWidgetProvider {
    // Handled in src/CapacitorListener.js
    private static final String URI_ADD = "donetick://chores/add";
    private static final String URI_SCAN = "donetick://chores/add?mode=scan";
    private static final String URI_VOICE = "donetick://chores/add?mode=voice";
    private static final String URI_SEARCH = "donetick://search";

    private static final int[] TILES = { R.id.action_0, R.id.action_1,
            R.id.action_2, R.id.action_3 };
    private static final int[] ICONS = { R.id.action_0_icon, R.id.action_1_icon,
            R.id.action_2_icon, R.id.action_3_icon };
    // The circle behind each icon is its own ImageView rather than the tile's
    // background, so that it stays round in a non-square cell.
    private static final int[] CIRCLES = { R.id.action_0_tile, R.id.action_1_tile,
            R.id.action_2_tile, R.id.action_3_tile };

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) manager.updateAppWidget(id, build(context, id));
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager,
                                          int appWidgetId, Bundle newOptions) {
        manager.updateAppWidget(appWidgetId, build(context, appWidgetId));
    }

    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        for (int id : appWidgetIds) WidgetStore.removeWidgetOptions(context, id);
    }

    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(
                new ComponentName(context, QuickActionsWidgetProvider.class));
        for (int id : ids) manager.updateAppWidget(id, build(context, id));
    }

    private static RemoteViews build(Context context, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_actions);
        WidgetTheme theme = WidgetTheme.of(context, appWidgetId);
        theme.applyBackground(context, views, appWidgetId);
        for (int slot = 0; slot < TILES.length; slot++) {
            String action = WidgetStore.quickAction(context, appWidgetId, slot);
            views.setImageViewResource(ICONS[slot], iconFor(action));
            views.setContentDescription(TILES[slot], context.getString(labelFor(action)));
            views.setOnClickPendingIntent(TILES[slot], deepLink(context, appWidgetId, slot,
                    uriFor(action)));
            if (theme.isForced()) {
                views.setImageViewResource(CIRCLES[slot], theme.actionTileBackground());
                views.setInt(ICONS[slot], "setColorFilter", theme.color(R.color.widget_accent));
            }
        }
        return views;
    }

    private static String uriFor(String action) {
        switch (action) {
            case "voice": return URI_VOICE;
            case "scan": return URI_SCAN;
            case "projects": return "donetick://projects";
            case "overview": return "donetick://overview";
            case "search": return URI_SEARCH;
            default: return URI_ADD;
        }
    }

    private static int iconFor(String action) {
        switch (action) {
            case "voice": return R.drawable.ic_widget_mic;
            case "scan": return R.drawable.ic_widget_scan;
            case "search": return R.drawable.ic_widget_search;
            case "projects": return R.drawable.ic_widget_projects;
            case "overview": return R.drawable.ic_widget_overview;
            default: return R.drawable.ic_widget_add;
        }
    }

    private static int labelFor(String action) {
        switch (action) {
            case "voice": return R.string.widget_action_voice;
            case "scan": return R.string.widget_action_photo;
            case "search": return R.string.widget_action_search;
            case "projects": return R.string.widget_action_projects;
            case "overview": return R.string.widget_action_overview;
            default: return R.string.widget_action_text;
        }
    }

    private static PendingIntent deepLink(Context context, int appWidgetId, int offset, String uri) {
        Intent intent = new Intent(context, com.donetick.app.MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        // Distinct data per bubble so the PendingIntents aren't collapsed.
        intent.setData(Uri.parse(uri));
        return PendingIntent.getActivity(context, appWidgetId * 1000 + 900 + offset, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}

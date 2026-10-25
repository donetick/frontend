package com.donetick.app.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

import com.donetick.app.R;

/** "Next 7 Days" home-screen widget: upcoming tasks grouped by day. */
public class WeekWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            manager.updateAppWidget(id, WidgetUi.build(context, WidgetUi.MODE_WEEK, id));
        }
        manager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_list);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (!WidgetUi.ACTION_REFRESH.equals(intent.getAction())) return;
        int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID);
        if (id != AppWidgetManager.INVALID_APPWIDGET_ID) {
            WidgetUi.refresh(context, WidgetUi.MODE_WEEK, id, goAsync());
        }
    }

    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            WidgetStore.removeWidgetOptions(context, id);
        }
    }
}

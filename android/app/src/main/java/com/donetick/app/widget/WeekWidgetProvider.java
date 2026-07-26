package com.donetick.app.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

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
    public void onDeleted(Context context, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            WidgetStore.removeWidgetOptions(context, id);
        }
    }
}

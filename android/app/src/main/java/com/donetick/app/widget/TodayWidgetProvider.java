package com.donetick.app.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

import com.donetick.app.R;

/** "Today" home-screen widget: tasks due today plus anything awaiting approval. */
public class TodayWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            manager.updateAppWidget(id, WidgetUi.build(context, WidgetUi.MODE_TODAY, id));
        }
        // Reload rows; the factory refreshes from the server when stale, which
        // is what keeps the widget current while the app stays closed.
        manager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_list);
    }

    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            WidgetStore.removeWidgetOptions(context, id);
        }
    }
}

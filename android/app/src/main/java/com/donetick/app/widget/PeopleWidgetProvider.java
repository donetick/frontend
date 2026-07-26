package com.donetick.app.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

import com.donetick.app.R;

/** "People" home-screen widget: every circle member with their task load. */
public class PeopleWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            manager.updateAppWidget(id, WidgetUi.build(context, WidgetUi.MODE_PEOPLE, id));
        }
        // Reload rows; the factory refreshes from the server when stale, which
        // is what keeps the widget current while the app stays closed.
        manager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_list);
    }
}

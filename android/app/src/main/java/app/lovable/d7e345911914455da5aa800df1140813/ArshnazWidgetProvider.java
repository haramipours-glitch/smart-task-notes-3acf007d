package app.lovable.d7e345911914455da5aa800df1140813;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

public class ArshnazWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_arshnaz);
            
            // Set task count (placeholder - in real app, fetch from Supabase)
            views.setTextViewText(R.id.widget_task_count, "۵ تسک امروز");
            
            // Set date
            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("EEEE dd MMMM", new java.util.Locale("fa"));
            String dateStr = sdf.format(new java.util.Date());
            views.setTextViewText(R.id.widget_date, dateStr);
            
            // Create intent for add task
            Intent addTaskIntent = new Intent(context, MainActivity.class);
            addTaskIntent.setAction("android.intent.action.MAIN");
            addTaskIntent.addCategory("android.intent.category.LAUNCHER");
            addTaskIntent.putExtra("widget_action", "add_task");
            addTaskIntent.setData(Uri.parse("arshnaz://add_task"));
            PendingIntent addTaskPendingIntent = PendingIntent.getActivity(
                context, 0, addTaskIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_add_task, addTaskPendingIntent);
            
            // Create intent for open app
            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setAction("android.intent.action.MAIN");
            openAppIntent.addCategory("android.intent.category.LAUNCHER");
            openAppIntent.setData(Uri.parse("arshnaz://today"));
            PendingIntent openAppPendingIntent = PendingIntent.getActivity(
                context, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_container, openAppPendingIntent);
            
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}

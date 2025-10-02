import { format } from "date-fns";

interface TaskData {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  priority?: string;
  status?: string;
}

export const generateICS = (task: TaskData): string => {
  const formatDate = (date: string) => {
    return format(new Date(date), "yyyyMMdd'T'HHmmss'Z'");
  };

  const now = formatDate(new Date().toISOString());
  const dueDate = formatDate(task.due_date);

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OneBill//Task Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${task.id}@onebill.ie`,
    `DTSTAMP:${now}`,
    `DTSTART:${dueDate}`,
    `DTEND:${dueDate}`,
    `SUMMARY:${task.title}`,
    task.description ? `DESCRIPTION:${task.description.replace(/\n/g, '\\n')}` : '',
    `PRIORITY:${task.priority === 'high' ? '1' : task.priority === 'medium' ? '5' : '9'}`,
    `STATUS:${task.status === 'done' ? 'COMPLETED' : 'NEEDS-ACTION'}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');

  return icsContent;
};

export const downloadICS = (task: TaskData) => {
  const icsContent = generateICS(task);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = `task-${task.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(link.href);
};

export const downloadMultipleICS = (tasks: TaskData[], filename: string = 'tasks') => {
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OneBill//Task Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  tasks.forEach(task => {
    const formatDate = (date: string) => {
      return format(new Date(date), "yyyyMMdd'T'HHmmss'Z'");
    };

    const now = formatDate(new Date().toISOString());
    const dueDate = formatDate(task.due_date);

    icsLines.push(
      'BEGIN:VEVENT',
      `UID:${task.id}@onebill.ie`,
      `DTSTAMP:${now}`,
      `DTSTART:${dueDate}`,
      `DTEND:${dueDate}`,
      `SUMMARY:${task.title}`,
    );

    if (task.description) {
      icsLines.push(`DESCRIPTION:${task.description.replace(/\n/g, '\\n')}`);
    }

    icsLines.push(
      `PRIORITY:${task.priority === 'high' ? '1' : task.priority === 'medium' ? '5' : '9'}`,
      `STATUS:${task.status === 'done' ? 'COMPLETED' : 'NEEDS-ACTION'}`,
      'END:VEVENT'
    );
  });

  icsLines.push('END:VCALENDAR');

  const icsContent = icsLines.join('\r\n');
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(link.href);
};

type TaskCategory = 'pre_event' | 'during_event' | 'post_event';

interface DependencyTask {
  id: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  category: TaskCategory;
}

interface TaskFormFieldsProps {
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  category: TaskCategory;
  onCategoryChange: (value: TaskCategory) => void;
  dueDate: string;
  onDueDateChange: (value: string) => void;
  dependsOnTaskId: number | null;
  onDependsOnChange: (value: number | null) => void;
  availableDeps?: DependencyTask[];
}

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500';

export function TaskFormFields({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  category,
  onCategoryChange,
  dueDate,
  onDueDateChange,
  dependsOnTaskId,
  onDependsOnChange,
  availableDeps,
}: TaskFormFieldsProps) {
  return (
    <>
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title *
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          required
          className={INPUT_CLASS}
          placeholder="Enter task title"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          className={INPUT_CLASS}
          placeholder="Enter task description"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          Category *
        </label>
        <select
          id="category"
          name="category"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value as TaskCategory)}
          required
          className={INPUT_CLASS}
        >
          <option value="pre_event">Pre-Event</option>
          <option value="during_event">During Event</option>
          <option value="post_event">Post-Event</option>
        </select>
      </div>

      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
          Due Date
        </label>
        <input
          id="dueDate"
          name="dueDate"
          type="datetime-local"
          value={dueDate}
          onChange={(e) => onDueDateChange(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="dependsOnTaskId" className="block text-sm font-medium text-gray-700 mb-1">
          Depends On
        </label>
        <select
          id="dependsOnTaskId"
          name="dependsOnTaskId"
          value={dependsOnTaskId || ''}
          onChange={(e) => onDependsOnChange(e.target.value ? Number(e.target.value) : null)}
          className={INPUT_CLASS}
        >
          <option value="">No dependency</option>
          {availableDeps?.map((dep) => (
            <option key={dep.id} value={dep.id}>
              {dep.title} ({dep.status})
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          This task cannot be started until the dependent task is completed.
        </p>
      </div>
    </>
  );
}

'use client';

import { useState } from 'react';
import { DietaryTagBadge, MenuItemCategoryBadge } from '@/components/menus';
import { trpc } from '@/lib/trpc';
import { useIsAdmin } from '@/lib/use-auth';

function formatCurrency(amount: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    parseFloat(amount)
  );
}

type MenuCategory = 'appetizer' | 'main' | 'side' | 'dessert' | 'beverage';

const categories: { value: MenuCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'appetizer', label: 'Appetizer' },
  { value: 'main', label: 'Main' },
  { value: 'side', label: 'Side' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'beverage', label: 'Beverage' },
];

const dietaryTagOptions = [
  'vegan',
  'vegetarian',
  'gluten_free',
  'halal',
  'kosher',
  'dairy_free',
  'nut_free',
] as const;

export default function MenuCatalogPage() {
  const { isAdmin } = useIsAdmin();
  const utils = trpc.useUtils();
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | ''>('');
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formCategory, setFormCategory] = useState<string>('main');
  const [formAllergens, setFormAllergens] = useState('');
  const [formDietaryTags, setFormDietaryTags] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: items, isLoading } = trpc.menu.listItems.useQuery({
    activeOnly: !showInactive,
    category: selectedCategory || undefined,
  });

  const createMutation = trpc.menu.createItem.useMutation({
    onSuccess: () => {
      utils.menu.listItems.invalidate();
      resetForm();
    },
  });

  const updateMutation = trpc.menu.updateItem.useMutation({
    onSuccess: () => {
      utils.menu.listItems.invalidate();
      resetForm();
    },
  });

  const deleteMutation = trpc.menu.deleteItem.useMutation({
    onSuccess: () => {
      utils.menu.listItems.invalidate();
    },
  });

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormName('');
    setFormDescription('');
    setFormCost('');
    setFormCategory('main');
    setFormAllergens('');
    setFormDietaryTags([]);
  }

  function startEdit(item: NonNullable<typeof items>[number]) {
    setEditingId(item.id);
    setFormName(item.name);
    setFormDescription(item.description ?? '');
    setFormCost(item.costPerPerson);
    setFormCategory(item.category);
    setFormAllergens((item.allergens ?? []).join(', '));
    setFormDietaryTags(item.dietaryTags ?? []);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const allergens = formAllergens
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: formName,
        description: formDescription || null,
        costPerPerson: formCost,
        category: formCategory as 'appetizer' | 'main' | 'side' | 'dessert' | 'beverage',
        allergens,
        dietaryTags: formDietaryTags as (typeof dietaryTagOptions)[number][],
      });
    } else {
      createMutation.mutate({
        name: formName,
        description: formDescription || undefined,
        costPerPerson: formCost,
        category: formCategory as 'appetizer' | 'main' | 'side' | 'dessert' | 'beverage',
        allergens,
        dietaryTags: formDietaryTags as (typeof dietaryTagOptions)[number][],
      });
    }
  }

  function toggleDietaryTag(tag: string) {
    setFormDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Menu Items</h1>
        {isAdmin && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
          >
            Add Menu Item
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Menu Item' : 'New Menu Item'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="menu-item-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Name
                </label>
                <input
                  id="menu-item-name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="menu-item-cost"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Cost per Person
                </label>
                <input
                  id="menu-item-cost"
                  type="text"
                  required
                  pattern="^\d+(\.\d{1,2})?$"
                  placeholder="0.00"
                  value={formCost}
                  onChange={(e) => setFormCost(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="menu-item-category"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Category
                </label>
                <select
                  id="menu-item-category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="appetizer">Appetizer</option>
                  <option value="main">Main</option>
                  <option value="side">Side</option>
                  <option value="dessert">Dessert</option>
                  <option value="beverage">Beverage</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="menu-item-allergens"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Allergens (comma-separated)
                </label>
                <input
                  id="menu-item-allergens"
                  type="text"
                  placeholder="e.g., nuts, dairy, soy"
                  value={formAllergens}
                  onChange={(e) => setFormAllergens(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="menu-item-description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <textarea
                id="menu-item-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">Dietary Tags</span>
              <div className="flex flex-wrap gap-2">
                {dietaryTagOptions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleDietaryTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                      formDietaryTags.includes(tag)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {tag.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-1">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  selectedCategory === cat.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show inactive
          </label>
        </div>
      </div>

      {/* Item List */}
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      ) : !items || items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No menu items found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">Category</th>
                <th className="text-right py-3 px-2 font-medium text-gray-500">Cost/Person</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">Dietary</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">Allergens</th>
                {isAdmin && (
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${!item.isActive ? 'opacity-50' : ''}`}
                >
                  <td className="py-3 px-4">
                    <div>
                      <span className="text-gray-900 font-medium">{item.name}</span>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <MenuItemCategoryBadge category={item.category} />
                  </td>
                  <td className="py-3 px-2 text-right text-gray-900 font-medium">
                    {formatCurrency(item.costPerPerson)}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex flex-wrap gap-1">
                      {item.dietaryTags?.map((tag) => (
                        <DietaryTagBadge key={tag} tag={tag} />
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-gray-600 text-xs">
                    {item.allergens?.join(', ') || '-'}
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          Edit
                        </button>
                        {item.isActive && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Deactivate "${item.name}"?`)) {
                                deleteMutation.mutate({ id: item.id });
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

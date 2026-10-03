import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { Category } from '../../types';
import { canUserDelete, canUserEdit } from '../../utils/permissions';
import { FolderTree, Plus, Edit2, Trash2, Save, X, Pill, Building2 } from 'lucide-react';

export const CategoriesView: React.FC = () => {
  const { language, categories, addCategory, updateCategory, deleteCategory, products, showToast, companySettings, updateCompanySettings, currentUser } = useApp();
  const { t } = useTranslation(language);

  const [activeTab, setActiveTab] = useState<'categories' | 'generics' | 'manufacturers'>('categories');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [description, setDescription] = useState('');

  // Generics & Manufacturers states
  const [newGeneric, setNewGeneric] = useState('');
  const [newManufacturer, setNewManufacturer] = useState('');

  const generics = companySettings.productGenerics || [];
  const manufacturers = companySettings.productManufacturers || [];

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setNameBn('');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setNameBn(cat.nameBn || '');
    setDescription(cat.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingCategory) {
      updateCategory(editingCategory.id, {
        name: name.trim(),
        nameBn: nameBn.trim() || name.trim(),
        code: editingCategory.code || name.trim().toUpperCase().replace(/\s+/g, '_'),
        description: description.trim() || undefined,
      });
    } else {
      addCategory({
        name: name.trim(),
        nameBn: nameBn.trim() || name.trim(),
        code: name.trim().toUpperCase().replace(/\s+/g, '_'),
        description: description.trim() || undefined,
      });
    }

    setIsModalOpen(false);
  };

  const hasDeletePermission = canUserDelete(currentUser, 'product');
  const hasEditPermission = canUserEdit(currentUser, 'product');

  const handleDelete = (cat: Category) => {
    const productCount = products.filter(p => p.categoryId === cat.id).length;
    if (productCount > 0) {
      showToast(
        language === 'bn'
          ? `এই ক্যাটাগরিতে ${productCount} টি পণ্য রয়েছে! প্রথমে পণ্য স্থানান্তর করুন।`
          : `Cannot delete: ${productCount} products are assigned to this category!`,
        'error'
      );
      return;
    }

    if (!hasDeletePermission) {
      showToast(language === 'bn' ? 'আপনার ক্যাটাগরি ডিলিট করার অনুমতি নেই' : 'You do not have permission to delete categories', 'error');
      return;
    }

    if (confirm(`Delete category "${cat.name}"?`)) {
      deleteCategory(cat.id);
    }
  };

  // Generic Handlers
  const handleAddGeneric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGeneric.trim()) return;
    if (generics.includes(newGeneric.trim())) {
      showToast('Already exists', 'warning');
      return;
    }
    updateCompanySettings({ productGenerics: [...generics, newGeneric.trim()] });
    setNewGeneric('');
  };

  const handleDeleteGeneric = (item: string) => {
    if (!hasDeletePermission) {
      showToast(language === 'bn' ? 'আপনার জেনেরিক ডিলিট করার অনুমতি নেই' : 'You do not have permission to delete generics', 'error');
      return;
    }
    if (confirm(`Delete Generic "${item}"?`)) {
      updateCompanySettings({ productGenerics: generics.filter(g => g !== item) });
    }
  };

  // Manufacturer Handlers
  const handleAddManufacturer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManufacturer.trim()) return;
    if (manufacturers.includes(newManufacturer.trim())) {
      showToast('Already exists', 'warning');
      return;
    }
    updateCompanySettings({ productManufacturers: [...manufacturers, newManufacturer.trim()] });
    setNewManufacturer('');
  };

  const handleDeleteManufacturer = (item: string) => {
    if (!hasDeletePermission) {
      showToast(language === 'bn' ? 'আপনার ব্র্যান্ড ডিলিট করার অনুমতি নেই' : 'You do not have permission to delete brands', 'error');
      return;
    }
    if (confirm(`Delete Manufacturer "${item}"?`)) {
      updateCompanySettings({ productManufacturers: manufacturers.filter(m => m !== item) });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-emerald-600" />
            <span>Product Taxonomy (ক্যাটাগরি, জেনেরিক ও কোম্পানি)</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {language === 'bn' ? 'পণ্যের বিভাগ, জেনেরিক নাম ও কোম্পানির তালিকা ম্যানেজমেন্ট' : 'Manage categories, generic names, and manufacturer brands'}
          </p>
        </div>

        <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm font-semibold">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-md cursor-pointer ${activeTab === 'categories' ? 'bg-white dark:bg-zinc-700 shadow-xs' : 'text-zinc-500'}`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab('generics')}
            className={`px-3 py-1.5 rounded-md cursor-pointer ${activeTab === 'generics' ? 'bg-white dark:bg-zinc-700 shadow-xs' : 'text-zinc-500'}`}
          >
            Generics
          </button>
          <button
            onClick={() => setActiveTab('manufacturers')}
            className={`px-3 py-1.5 rounded-md cursor-pointer ${activeTab === 'manufacturers' ? 'bg-white dark:bg-zinc-700 shadow-xs' : 'text-zinc-500'}`}
          >
            Brands
          </button>
        </div>
      </div>

      {activeTab === 'categories' && (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Category</span>
            </button>
          </div>
          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map(cat => {
              const count = products.filter(p => p.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-zinc-900 dark:text-white text-sm">
                        {cat.name}
                      </h3>
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded text-xs font-mono font-bold">
                        {count} SKUs
                      </span>
                    </div>
                    {cat.nameBn && (
                      <p className="text-xs text-zinc-500 mt-0.5">{cat.nameBn}</p>
                    )}
                    {cat.description && (
                      <p className="text-[11px] text-zinc-400 mt-2 line-clamp-2">{cat.description}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-1">
                    {hasEditPermission && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(cat)}
                        className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {hasDeletePermission && (
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'generics' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-zinc-900 dark:text-white">
              <Pill className="w-4 h-4 text-emerald-600" />
              <span>Add Generic Name</span>
            </h3>
            <form onSubmit={handleAddGeneric} className="space-y-3">
              <input
                type="text"
                required
                value={newGeneric}
                onChange={e => setNewGeneric(e.target.value)}
                placeholder="e.g. Paracetamol 500mg"
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg text-sm"
              />
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm"
              >
                Save Generic
              </button>
            </form>
          </div>
          <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs">
            <h3 className="font-bold text-sm mb-4 text-zinc-900 dark:text-white">Generics List ({generics.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {generics.map(item => (
                <div key={item} className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-700">
                  <span className="text-sm font-medium">{item}</span>
                  {hasDeletePermission && (
                    <button onClick={() => handleDeleteGeneric(item)} className="p-1 text-rose-500 hover:bg-rose-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {generics.length === 0 && <p className="text-sm text-zinc-500">No generics added yet.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'manufacturers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-zinc-900 dark:text-white">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Add Manufacturer / Brand</span>
            </h3>
            <form onSubmit={handleAddManufacturer} className="space-y-3">
              <input
                type="text"
                required
                value={newManufacturer}
                onChange={e => setNewManufacturer(e.target.value)}
                placeholder="e.g. Square Pharmaceuticals"
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg text-sm"
              />
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm"
              >
                Save Brand
              </button>
            </form>
          </div>
          <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs">
            <h3 className="font-bold text-sm mb-4 text-zinc-900 dark:text-white">Manufacturers List ({manufacturers.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {manufacturers.map(item => (
                <div key={item} className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-700">
                  <span className="text-sm font-medium">{item}</span>
                  {hasDeletePermission && (
                    <button onClick={() => handleDeleteManufacturer(item)} className="p-1 text-rose-500 hover:bg-rose-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {manufacturers.length === 0 && <p className="text-sm text-zinc-500">No manufacturers added yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Category Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Computer Accessories"
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  ক্যাটাগরির নাম (বাংলা)
                </label>
                <input
                  type="text"
                  value={nameBn}
                  onChange={e => setNameBn(e.target.value)}
                  placeholder="ঐচ্ছিক বাংলা নাম"
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Category details..."
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

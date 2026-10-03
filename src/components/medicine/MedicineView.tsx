import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/translations';
import { Product, ProductBatch, UnitType, DiseaseMasterEntry, DiseaseMasterMedicine } from '../../types';
import { canUserEdit, canUserDelete } from '../../utils/permissions';
import { INITIAL_DISEASE_MASTER } from '../../data/diseaseMasterData';
import {
  Pill,
  Package,
  Search,
  Plus,
  AlertTriangle,
  Calendar,
  Layers,
  MapPin,
  Building2,
  Filter,
  Trash2,
  Edit2,
  ShoppingCart,
  CheckCircle2,
  Clock,
  RefreshCw,
  Sparkles,
  Printer,
  Download,
  Info,
  ChevronRight,
  X,
  Stethoscope,
  Activity,
  HeartPulse,
  BookOpen,
  Check,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  SlidersHorizontal,
  ChevronDown,
  Tags,
  FolderPlus,
  Tag
} from 'lucide-react';

export interface DiseaseCategoryItem {
  id: string;
  name: string;
  nameBn: string;
  isDefault?: boolean;
}

const COMMON_DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Suspension',
  'Injection',
  'Eye Drop',
  'Ear Drop',
  'Nasal Drop',
  'Ointment',
  'Gel',
  'Cream',
  'Inhaler',
  'Suppository',
  'Powder / Sachet',
  'Lozenge',
  'Mouthwash / Gargle',
];

const COMMON_PHARMA_COMPANIES = [
  'Square Pharmaceuticals Ltd.',
  'Beximco Pharmaceuticals Ltd.',
  'Incepta Pharmaceuticals Ltd.',
  'Renata Limited',
  'ACI Limited',
  'Eskayef Pharmaceuticals Ltd.',
  'Aristopharma Ltd.',
  'Healthcare Pharmaceuticals Ltd.',
  'Drug International Ltd.',
  'Opsonin Pharma Ltd.',
  'Popular Pharmaceuticals Ltd.',
  'ACME Laboratories Ltd.',
  'General Pharmaceuticals Ltd.',
  'Delta Pharma Ltd.',
  'Beacon Pharmaceuticals Ltd.',
];

const COMMON_DISEASE_CATEGORIES: DiseaseCategoryItem[] = [
  { id: 'ALL', name: 'সকল রোগ (All Diseases)', nameBn: 'সকল রোগ', isDefault: true },
  { id: 'General & Pain', name: 'জ্বর ও ব্যথা (Fever & Pain)', nameBn: 'জ্বর ও সাধারণ ব্যথা', isDefault: true },
  { id: 'Gastrointestinal', name: 'গ্যাস্ট্রিক ও পেট (Gastric & Stomach)', nameBn: 'গ্যাস্ট্রিক ও পরিপাকতন্ত্র', isDefault: true },
  { id: 'Respiratory', name: 'সর্দি ও কাশি (Cold & Cough)', nameBn: 'শ্বাসতন্ত্র ও কাশি', isDefault: true },
  { id: 'Dermatology & Allergy', name: 'অ্যালার্জি ও চর্ম (Allergy & Skin)', nameBn: 'অ্যালার্জি ও চুলকানি', isDefault: true },
  { id: 'ENT (Ear, Nose, Throat)', name: 'নাক, কান ও গলা (ENT)', nameBn: 'নাক, কান ও গলা', isDefault: true },
  { id: 'Dental Care', name: 'দাঁত ও মাড়ি (Dental)', nameBn: 'দাঁত ও মাড়ির যত্ন', isDefault: true },
  { id: 'Cardiovascular', name: 'উচ্চ রক্তচাপ (Blood Pressure)', nameBn: 'হৃদরোগ ও রক্তচাপ', isDefault: true },
  { id: 'Endocrinology', name: 'ডায়াবেটিস (Diabetes)', nameBn: 'ডায়াবেটিস', isDefault: true },
  { id: 'Urology', name: 'প্রস্রাব ও কিডনি (UTI)', nameBn: 'মূত্রনালী ও কিডনি', isDefault: true },
  { id: 'Supplements & Nutrition', name: 'ভিটামিন ও পুষ্টি (Supplements)', nameBn: 'পুষ্টি ও দুর্বলতা', isDefault: true },
];

const SAMPLE_DEMO_MEDICINES = [
  {
    name: 'Napa Extra',
    nameBn: 'নাপা এক্সট্রা',
    generic: 'Paracetamol + Caffeine',
    manufacturer: 'Beximco Pharmaceuticals Ltd.',
    dosageForm: 'Tablet',
    strength: '500mg + 65mg',
    rackLocation: 'Rack A-01',
    stripSize: 10,
    salesPrice: 3.0,
    purchasePrice: 2.4,
    stock: 250,
    reorderLevel: 50,
    unit: 'Pcs' as UnitType,
    barcode: '8901001',
    batchNumber: 'BX-2024-N01',
    expDate: '2026-12-31',
    diseases: ['জ্বর', 'মাথাব্যথা', 'শরীর ব্যথা', 'Fever', 'Headache'],
    dosageSchedule: '১ + ১ + ১ (দিনে ৩ বার)',
    mealTiming: 'খাওয়ার পর (ভরা পেটে)',
    duration: '৩ - ৫ দিন',
    instructions: 'জ্বর ১০০.৫° বা তার বেশি হলে বা গায়ে তীব্র ব্যথা থাকলে খাবেন।',
  },
  {
    name: 'Seclo 20',
    nameBn: 'সেকলো ২০',
    generic: 'Omeprazole',
    manufacturer: 'Square Pharmaceuticals Ltd.',
    dosageForm: 'Capsule',
    strength: '20mg',
    rackLocation: 'Rack A-03',
    stripSize: 10,
    salesPrice: 6.0,
    purchasePrice: 4.8,
    stock: 180,
    reorderLevel: 30,
    unit: 'Pcs' as UnitType,
    barcode: '8901002',
    batchNumber: 'SQ-2024-S20',
    expDate: '2027-04-15',
    diseases: ['গ্যাস্ট্রিক', 'বুক জ্বালা', 'পেটের আলসার', 'Gastric', 'Acidity'],
    dosageSchedule: '১ + ০ + ১ (সকালে ও রাতে)',
    mealTiming: 'খাওয়ার ৩০ মিনিট আগে (খালি পেটে)',
    duration: '১৪ দিন',
    instructions: 'সকালে ঘুম থেকে উঠে খালি পেটে ও রাতে খাবারের আধা ঘণ্টা আগে।',
  },
  {
    name: 'Ace Plus',
    nameBn: 'এইস প্লাস',
    generic: 'Paracetamol + Caffeine',
    manufacturer: 'Square Pharmaceuticals Ltd.',
    dosageForm: 'Tablet',
    strength: '500mg + 65mg',
    rackLocation: 'Rack A-01',
    stripSize: 10,
    salesPrice: 3.0,
    purchasePrice: 2.4,
    stock: 140,
    reorderLevel: 40,
    unit: 'Pcs' as UnitType,
    barcode: '8901003',
    batchNumber: 'SQ-2024-AP08',
    expDate: '2026-11-20',
    diseases: ['জ্বর', 'মাথাব্যথা', 'Fever', 'Pain'],
    dosageSchedule: '১ + ০ + ১ (দিনে ২ বার)',
    mealTiming: 'খাওয়ার পর',
    duration: '৩ দিন',
    instructions: 'মাথাব্যথা ও জ্বরে দ্রুত আরাম দেয়।',
  },
  {
    name: 'Maxpro 20',
    nameBn: 'ম্যাক্সপ্রো ২০',
    generic: 'Esomeprazole',
    manufacturer: 'Aristopharma Ltd.',
    dosageForm: 'Tablet',
    strength: '20mg',
    rackLocation: 'Rack B-02',
    stripSize: 10,
    salesPrice: 8.0,
    purchasePrice: 6.5,
    stock: 90,
    reorderLevel: 30,
    unit: 'Pcs' as UnitType,
    barcode: '8901004',
    batchNumber: 'AR-2024-M20',
    expDate: '2026-10-30',
    diseases: ['গ্যাস্ট্রিক', 'অম্বল', 'বুক জ্বালাপোড়া', 'Gastric', 'GERD'],
    dosageSchedule: '১ + ০ + ১ (দিনে ২ বার)',
    mealTiming: 'খাওয়ার ৩০ মিনিট আগে (খালি পেটে)',
    duration: '১৪ দিন',
    instructions: 'তীব্র গ্যাস্ট্রিক ও বুক জ্বালাপোড়ায় অত্যন্ত কার্যকর।',
  },
  {
    name: 'Ciprocin 500',
    nameBn: 'সিপ্রোসিন ৫০০',
    generic: 'Ciprofloxacin',
    manufacturer: 'Square Pharmaceuticals Ltd.',
    dosageForm: 'Tablet',
    strength: '500mg',
    rackLocation: 'Rack B-05',
    stripSize: 10,
    salesPrice: 15.0,
    purchasePrice: 12.0,
    stock: 60,
    reorderLevel: 20,
    unit: 'Pcs' as UnitType,
    barcode: '8901005',
    batchNumber: 'SQ-2024-C50',
    expDate: '2026-05-15',
    diseases: ['ডায়রিয়া', 'টাইফয়েড', 'ইনফেকশন', 'Diarrhea', 'Infection'],
    dosageSchedule: '১ + ০ + ১ (দিনে ২ বার)',
    mealTiming: 'খাওয়ার পর',
    duration: '৫ দিন',
    instructions: 'প্রতি ১২ ঘণ্টা পর পর ১টি। প্রচুর পানি পান করুন। সম্পূর্ণ কোর্স শেষ করুন।',
  },
  {
    name: 'Fexo 120',
    nameBn: 'ফেক্সো ১২০',
    generic: 'Fexofenadine Hydrochloride',
    manufacturer: 'Square Pharmaceuticals Ltd.',
    dosageForm: 'Tablet',
    strength: '120mg',
    rackLocation: 'Rack C-01',
    stripSize: 10,
    salesPrice: 9.0,
    purchasePrice: 7.2,
    stock: 110,
    reorderLevel: 25,
    unit: 'Pcs' as UnitType,
    barcode: '8901006',
    batchNumber: 'SQ-2024-FX12',
    expDate: '2027-02-28',
    diseases: ['সর্দি', 'হাঁচি', 'নাক দিয়ে পানি পড়া', 'অ্যালার্জি', 'Cold', 'Allergy'],
    dosageSchedule: '১ + ০ + ০ অথবা ০ + ০ + ১ (দিনে ১ বার)',
    mealTiming: 'খাওয়ার পর',
    duration: '৫ - ৭ দিন',
    instructions: 'অ্যালার্জি, হাঁচি ও নাক দিয়ে পানি পড়ার জন্য ১টি। ঝিমুনি কম হয়।',
  },
  {
    name: 'Alatrol Syrup',
    nameBn: 'অ্যালাট্রল সিরাপ',
    generic: 'Cetirizine Hydrochloride',
    manufacturer: 'Square Pharmaceuticals Ltd.',
    dosageForm: 'Syrup',
    strength: '5mg/5ml (60ml)',
    rackLocation: 'Syrup Shelf-01',
    stripSize: 1,
    salesPrice: 40.0,
    purchasePrice: 32.0,
    stock: 18,
    reorderLevel: 10,
    unit: 'Pcs' as UnitType,
    barcode: '8901007',
    batchNumber: 'SQ-2023-AL09',
    expDate: '2026-04-10',
    diseases: ['সর্দি', 'অ্যালার্জি', 'চুলকানি', 'Cold', 'Allergy'],
    dosageSchedule: '১ চা চামচ (রাতে ১ বার)',
    mealTiming: 'খাওয়ার পর (রাতে)',
    duration: '৫ দিন',
    instructions: 'শিশুদের সর্দি ও চুলকানিতে রাতে শোবার আগে।',
  },
  {
    name: 'Tusca Syrup',
    nameBn: 'টাস্কা সিরাপ',
    generic: 'Dextromethorphan + Pseudoephedrine + Guaiphenesin',
    manufacturer: 'Square Pharmaceuticals Ltd.',
    dosageForm: 'Syrup',
    strength: '100ml',
    rackLocation: 'Syrup Shelf-02',
    stripSize: 1,
    salesPrice: 85.0,
    purchasePrice: 70.0,
    stock: 12,
    reorderLevel: 8,
    unit: 'Pcs' as UnitType,
    barcode: '8901008',
    batchNumber: 'SQ-2024-TS01',
    expDate: '2026-08-30',
    diseases: ['কাশি', 'কফ', 'বুকে ঘড়ঘড়', 'Cough', 'Chest Congestion'],
    dosageSchedule: '২ চা চামচ (দিনে ৩ বার)',
    mealTiming: 'খাওয়ার পর',
    duration: '৫ - ৭ দিন',
    instructions: 'কুসুম গরম পানির সাথে সেবন করলে দ্রুত কাশি উপশম হয়।',
  },
  {
    name: 'Monas 10',
    nameBn: 'মোনাস ১০',
    generic: 'Montelukast Sodium',
    manufacturer: 'Acme Laboratories Ltd.',
    dosageForm: 'Tablet',
    strength: '10mg',
    rackLocation: 'Rack C-04',
    stripSize: 10,
    salesPrice: 17.5,
    purchasePrice: 14.0,
    stock: 75,
    reorderLevel: 20,
    unit: 'Pcs' as UnitType,
    barcode: '8901009',
    batchNumber: 'AC-2024-MN10',
    expDate: '2027-06-30',
    diseases: ['কাশি', 'শ্বাসকষ্ট', 'অ্যালার্জিক ব্রঙ্কাইটিস', 'Asthma', 'Cough'],
    dosageSchedule: '০ + ০ + ১ (রাতে ১ বার)',
    mealTiming: 'খাওয়ার পর (রাতে ঘুমানোর আগে)',
    duration: '১৫ - ৩০ দিন',
    instructions: 'রাতের কাশি ও শ্বাসকষ্ট কমাতে নিয়মিত রাতে ১টি।',
  },
  {
    name: 'Azithrocin 500',
    nameBn: 'অ্যাজিথ্রোসিন ৫০০',
    generic: 'Azithromycin',
    manufacturer: 'Beximco Pharmaceuticals Ltd.',
    dosageForm: 'Tablet',
    strength: '500mg',
    rackLocation: 'Rack B-08',
    stripSize: 6,
    salesPrice: 35.0,
    purchasePrice: 28.0,
    stock: 36,
    reorderLevel: 12,
    unit: 'Pcs' as UnitType,
    barcode: '8901010',
    batchNumber: 'BX-2024-AZ05',
    expDate: '2026-09-15',
    diseases: ['গলা ব্যথা', 'টনসিল', 'ইনফেকশন', 'Sore Throat', 'Tonsillitis'],
    dosageSchedule: '১ + ০ + ০ (দিনে ১ বার)',
    mealTiming: 'খাওয়ার ১ ঘণ্টা আগে অথবা ২ ঘণ্টা পর',
    duration: '৩ - ৫ দিন',
    instructions: 'ব্যাকটেরিয়াল গলার ইনফেকশন ও টনসিলের অ্যান্টিবায়োটিক। পূর্ণ কোর্স শেষ করুন।',
  },
];

export const MedicineView: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    categories,
    addCategory,
    language,
    currentUser,
    setActiveTab,
    showToast,
    companySettings
  } = useApp();

  const { t } = useTranslation(language);

  // Top Section Mode: 'diseases' (রোগ অনুযায়ী ঔষধ ও সেবনবিধি) vs 'categories' (ক্যাটাগরি তালিকা) vs 'master' (রোগের তালিকা ও প্রোটোকল মাস্টার)
  const [activeSubView, setActiveSubView] = useState<'diseases' | 'categories' | 'master'>('diseases');

  // Disease Master State (persisted in localStorage)
  const [diseaseMaster, setDiseaseMaster] = useState<DiseaseMasterEntry[]>(() => {
    try {
      const saved = localStorage.getItem('dokanpro_disease_master');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading disease master from localStorage', e);
    }
    return INITIAL_DISEASE_MASTER;
  });

  // Save diseaseMaster to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('dokanpro_disease_master', JSON.stringify(diseaseMaster));
    } catch (e) {
      console.error('Error saving disease master to localStorage', e);
    }
  }, [diseaseMaster]);

  // Disease Categories State (persisted in localStorage)
  const [diseaseCategories, setDiseaseCategories] = useState<DiseaseCategoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('dokanpro_disease_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading disease categories from localStorage', e);
    }
    return COMMON_DISEASE_CATEGORIES;
  });

  // Save diseaseCategories to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('dokanpro_disease_categories', JSON.stringify(diseaseCategories));
    } catch (e) {
      console.error('Error saving disease categories to localStorage', e);
    }
  }, [diseaseCategories]);

  // Category Management Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatNameBn, setNewCatNameBn] = useState('');
  const [newCatNameEn, setNewCatNameEn] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [categoryViewStyle, setCategoryViewStyle] = useState<'chips' | 'list'>('chips');

  // Disease Search Query
  const [diseaseSearchQuery, setDiseaseSearchQuery] = useState('');
  const [selectedDiseaseCategory, setSelectedDiseaseCategory] = useState('ALL');

  // Disease Master Add/Edit Modal
  const [isDiseaseModalOpen, setIsDiseaseModalOpen] = useState(false);
  const [editingDisease, setEditingDisease] = useState<DiseaseMasterEntry | null>(null);
  const [diseaseFormData, setDiseaseFormData] = useState<DiseaseMasterEntry>({
    id: '',
    diseaseName: '',
    diseaseNameBn: '',
    category: 'General & Pain',
    categoryBn: 'সাধারণ রোগ ও ব্যথা',
    symptoms: [],
    description: '',
    recommendedMedicines: [
      {
        medicineName: '',
        genericName: '',
        dosageForm: 'Tablet',
        strength: '',
        dosageSchedule: '১ + ০ + ১ (দিনে ২ বার)',
        frequencyPerDay: 2,
        mealTiming: 'খাওয়ার পর (ভরা পেটে)',
        duration: '৩ - ৫ দিন',
        instructions: '',
        precautions: '',
      }
    ],
  });

  // Helper to auto-populate Generic, Batch No, Category, Brand / Company from Products List
  const applyProductToMedicine = (selectedProd: Product, idx: number) => {
    const updated = [...diseaseFormData.recommendedMedicines];
    const catName = selectedProd.categoryName || categories.find(c => c.id === selectedProd.categoryId)?.name || 'Medicine';
    const batchNum = selectedProd.batchNumber || selectedProd.batches?.[0]?.batchNumber || '';

    updated[idx] = {
      ...updated[idx],
      medicineName: selectedProd.name,
      genericName: selectedProd.generic || '',
      batchNumber: batchNum,
      categoryName: catName,
      manufacturer: selectedProd.manufacturer || '',
      strength: selectedProd.strength || '',
      dosageForm: selectedProd.dosageForm || 'Tablet',
      expDate: selectedProd.expDate || '',
      rackLocation: selectedProd.rackLocation || '',
      salesPrice: selectedProd.salesPrice || 0,
      stock: selectedProd.stock || 0,
      ...(selectedProd.dosageSchedule ? { dosageSchedule: selectedProd.dosageSchedule } : {}),
      ...(selectedProd.mealTiming ? { mealTiming: selectedProd.mealTiming } : {}),
      ...(selectedProd.duration ? { duration: selectedProd.duration } : {}),
      ...(selectedProd.instructions ? { instructions: selectedProd.instructions } : {}),
    };
    setDiseaseFormData(prev => ({ ...prev, recommendedMedicines: updated }));
  };

  // Add new disease category
  const handleAddCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const bn = newCatNameBn.trim();
    if (!bn) {
      showToast(language === 'bn' ? 'অনুগ্রহ করে ক্যাটাগরির নাম (বাংলায়) লিখুন!' : 'Please enter category name!', 'error');
      return;
    }
    const en = newCatNameEn.trim() || bn;
    
    // Check duplicate
    if (diseaseCategories.some(c => c.nameBn.toLowerCase() === bn.toLowerCase() || (c.name && c.name.toLowerCase() === en.toLowerCase()))) {
      showToast(language === 'bn' ? 'এই নামের ক্যাটাগরি ইতিমধ্যে রয়েছে!' : 'Category already exists!', 'error');
      return;
    }

    const newCat: DiseaseCategoryItem = {
      id: 'cat_' + Date.now(),
      name: en,
      nameBn: bn,
      isDefault: false,
    };

    setDiseaseCategories(prev => [...prev, newCat]);
    setNewCatNameBn('');
    setNewCatNameEn('');
    showToast(language === 'bn' ? `"${bn}" ক্যাটাগরি যুক্ত করা হয়েছে!` : `Category "${bn}" added!`, 'success');
  };

  // Delete disease category
  const handleDeleteCategory = (catId: string) => {
    if (catId === 'ALL') {
      showToast(language === 'bn' ? '"সকল রোগ" ফিল্টারটি ডিলিট করা সম্ভব নয়!' : 'Cannot delete "All" category!', 'error');
      return;
    }

    const cat = diseaseCategories.find(c => c.id === catId);
    if (!cat) return;

    const count = diseaseMaster.filter(d => d.category === catId || d.categoryBn === cat.nameBn || d.category === cat.name).length;
    const confirmMsg = language === 'bn'
      ? `আপনি কি নিশ্চিত যে "${cat.nameBn}" ক্যাটাগরিটি ডিলিট করতে চান?${count > 0 ? `\n(সতর্কতা: ${count}টি রোগে এই ক্যাটাগরি ব্যবহার করা হয়েছে)` : ''}`
      : `Are you sure you want to delete category "${cat.nameBn}"?${count > 0 ? `\n(Warning: ${count} diseases are currently in this category)` : ''}`;

    if (window.confirm(confirmMsg)) {
      setDiseaseCategories(prev => prev.filter(c => c.id !== catId));
      if (selectedDiseaseCategory === catId) {
        setSelectedDiseaseCategory('ALL');
      }
      showToast(language === 'bn' ? `"${cat.nameBn}" ক্যাটাগরি সফলভাবে ডিলিট করা হয়েছে!` : `Category "${cat.nameBn}" deleted!`, 'success');
    }
  };

  // Reset categories to default
  const handleResetCategories = () => {
    if (window.confirm(language === 'bn' ? 'আপনি কি ক্যাটাগরি তালিকা ডিফল্ট অবস্থায় রিস্টোর করতে চান?' : 'Restore default categories?')) {
      setDiseaseCategories(COMMON_DISEASE_CATEGORIES);
      setSelectedDiseaseCategory('ALL');
      showToast(language === 'bn' ? 'ডিফল্ট ক্যাটাগরি তালিকা রিস্টোর হয়েছে!' : 'Categories restored to default!', 'success');
    }
  };

  // Listen to external custom events (from Sidebar)
  useEffect(() => {
    const handleSwitchTab = (e: CustomEvent) => {
      if (e.detail === 'diseases') {
        setActiveSubView('diseases');
      } else if (e.detail === 'categories') {
        setActiveSubView('categories');
      } else if (e.detail === 'master') {
        setActiveSubView('master');
      }
    };

    window.addEventListener('switch-medicine-tab' as any, handleSwitchTab);
    return () => {
      window.removeEventListener('switch-medicine-tab' as any, handleSwitchTab);
    };
  }, []);

  // Helper: Get list of diseases belonging to a category
  const getDiseasesForCategory = (cat: DiseaseCategoryItem) => {
    if (cat.id === 'ALL') return diseaseMaster;
    return diseaseMaster.filter(
      d =>
        d.category === cat.id ||
        (d.categoryBn && d.categoryBn.toLowerCase() === cat.nameBn.toLowerCase()) ||
        (d.category && d.category.toLowerCase() === cat.name.toLowerCase()) ||
        (cat.id && d.category.toLowerCase() === cat.id.toLowerCase())
    );
  };

  // Filtered categories for category list search
  const filteredCategoriesList = useMemo(() => {
    const q = categorySearchQuery.trim().toLowerCase();
    if (!q) return diseaseCategories;
    return diseaseCategories.filter(
      c =>
        c.nameBn.toLowerCase().includes(q) ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        c.id.toLowerCase().includes(q)
    );
  }, [diseaseCategories, categorySearchQuery]);



  // Medicine List from products
  const medicineList = useMemo(() => {
    return products.filter(p => {
      const isMedicineCategory =
        p.categoryId === 'cat-medicine' ||
        p.categoryName?.toLowerCase().includes('medicine') ||
        p.categoryName?.toLowerCase().includes('ঔষধ');
      const hasMedicineMeta = !!p.generic || !!p.dosageForm || (Array.isArray(p.diseases) && p.diseases.length > 0);
      return isMedicineCategory || hasMedicineMeta;
    });
  }, [products]);

  // Map of products by name/generic for fast live store stock lookup
  const productStockMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach(p => {
      map.set(p.name.trim().toLowerCase(), p);
      if (p.generic) {
        map.set(p.generic.trim().toLowerCase(), p);
      }
    });
    return map;
  }, [products]);

  // Find store stock for a recommended medicine
  const findProductStock = (medName: string, genericName?: string) => {
    const cleanMed = medName.toLowerCase();
    // Try matching brand name
    let matched = products.find(p => cleanMed.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(cleanMed.split('/')[0].trim().toLowerCase()));
    if (!matched && genericName) {
      const cleanGen = genericName.toLowerCase();
      matched = products.find(p => p.generic && (p.generic.toLowerCase().includes(cleanGen) || cleanGen.includes(p.generic.toLowerCase())));
    }
    return matched;
  };

  // Compute overall stats
  const now = new Date();
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(now.getDate() + 90);

  const stats = useMemo(() => {
    let totalItems = medicineList.length;
    let totalStockUnits = 0;
    let expiredCount = 0;
    let expiringSoonCount = 0;
    let lowStockCount = 0;
    const genericSet = new Set<string>();

    medicineList.forEach(m => {
      totalStockUnits += m.stock;
      if (m.generic) genericSet.add(m.generic.trim().toLowerCase());
      if (m.stock <= m.reorderLevel) lowStockCount++;

      if (m.expDate) {
        const exp = new Date(m.expDate);
        if (exp < now) {
          expiredCount++;
        } else if (exp <= ninetyDaysFromNow) {
          expiringSoonCount++;
        }
      }
    });

    return {
      totalItems,
      totalStockUnits,
      expiredCount,
      expiringSoonCount,
      lowStockCount,
      genericCount: genericSet.size,
      totalDiseases: diseaseMaster.length,
    };
  }, [medicineList, diseaseMaster, now, ninetyDaysFromNow]);

  // Filtered Disease Master Entries based on Search Query (Strictly matches the typed disease name)
  const filteredDiseases = useMemo(() => {
    const query = diseaseSearchQuery.trim().toLowerCase();

    // 1. Filter by category first (if a specific category is selected)
    const categoryFiltered = diseaseMaster.filter(dis => {
      if (selectedDiseaseCategory !== 'ALL') {
        const catObj = diseaseCategories.find(c => c.id === selectedDiseaseCategory);
        const matchCategory =
          dis.category === selectedDiseaseCategory ||
          (catObj && (
            (dis.categoryBn && dis.categoryBn.toLowerCase() === catObj.nameBn.toLowerCase()) ||
            (dis.category && dis.category.toLowerCase() === catObj.name.toLowerCase()) ||
            (catObj.id && dis.category.toLowerCase() === catObj.id.toLowerCase())
          ));
        if (!matchCategory) return false;
      }
      return true;
    });

    if (!query) return categoryFiltered;

    // 2. Strict matching directly on Disease Name (বাংলা ও ইংরেজি)
    const directNameMatches = categoryFiltered.filter(dis => {
      const nameBn = dis.diseaseNameBn.toLowerCase();
      const nameEn = dis.diseaseName.toLowerCase();
      return nameBn.includes(query) || nameEn.includes(query);
    });

    if (directNameMatches.length > 0) {
      // Return ONLY diseases whose name directly matches the query!
      return directNameMatches.sort((a, b) => {
        const aNameBn = a.diseaseNameBn.toLowerCase();
        const bNameBn = b.diseaseNameBn.toLowerCase();

        // Exact name match first
        const aExact = aNameBn === query || a.diseaseName.toLowerCase() === query;
        const bExact = bNameBn === query || b.diseaseName.toLowerCase() === query;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Starts with query first
        const aStarts = aNameBn.startsWith(query) || a.diseaseName.toLowerCase().startsWith(query);
        const bStarts = bNameBn.startsWith(query) || b.diseaseName.toLowerCase().startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return 0;
      });
    }

    // 3. Fallback: If no direct disease name match, check query individual words in disease title
    const queryWords = query.split(/\s+/).filter(w => w.length > 1);
    if (queryWords.length > 0) {
      const wordMatches = categoryFiltered.filter(dis => {
        const nameBn = dis.diseaseNameBn.toLowerCase();
        const nameEn = dis.diseaseName.toLowerCase();
        return queryWords.some(w => nameBn.includes(w) || nameEn.includes(w));
      });
      if (wordMatches.length > 0) {
        return wordMatches;
      }
    }

    // 4. Secondary fallback: exact symptom match ONLY if no disease title match was found
    return categoryFiltered.filter(dis => {
      const symptoms = Array.isArray(dis.symptoms) ? dis.symptoms.map(s => s.toLowerCase()) : [];
      return symptoms.some(s => s === query || s.includes(query));
    });
  }, [diseaseMaster, diseaseSearchQuery, selectedDiseaseCategory, diseaseCategories]);



  // Open Disease Master Modal
  const handleOpenAddDiseaseModal = () => {
    setEditingDisease(null);
    setDiseaseFormData({
      id: `dis-${Date.now()}`,
      diseaseName: '',
      diseaseNameBn: '',
      category: 'General & Pain',
      categoryBn: 'সাধারণ রোগ ও ব্যথা',
      symptoms: [],
      description: '',
      recommendedMedicines: [
        {
          medicineName: '',
          genericName: '',
          dosageForm: 'Tablet',
          strength: '',
          dosageSchedule: '১ + ০ + ১ (দিনে ২ বার)',
          frequencyPerDay: 2,
          mealTiming: 'খাওয়ার পর (ভরা পেটে)',
          duration: '৩ - ৫ দিন',
          instructions: '',
          precautions: '',
        }
      ],
    });
    setIsDiseaseModalOpen(true);
  };

  const handleOpenEditDiseaseModal = (dis: DiseaseMasterEntry) => {
    setEditingDisease(dis);
    setDiseaseFormData(JSON.parse(JSON.stringify(dis)));
    setIsDiseaseModalOpen(true);
  };

  // Save Disease Master Entry
  const handleSaveDiseaseMaster = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diseaseFormData.diseaseNameBn.trim() && !diseaseFormData.diseaseName.trim()) {
      showToast(language === 'bn' ? 'রোগের নাম লিখুন!' : 'Enter disease name!', 'warning');
      return;
    }

    const cleanedEntry: DiseaseMasterEntry = {
      ...diseaseFormData,
      id: diseaseFormData.id || `dis-${Date.now()}`,
      diseaseName: diseaseFormData.diseaseName.trim() || diseaseFormData.diseaseNameBn.trim(),
      diseaseNameBn: diseaseFormData.diseaseNameBn.trim() || diseaseFormData.diseaseName.trim(),
      recommendedMedicines: diseaseFormData.recommendedMedicines.filter(m => m.medicineName.trim().length > 0),
    };

    if (editingDisease) {
      setDiseaseMaster(prev => prev.map(d => (d.id === editingDisease.id ? cleanedEntry : d)));
      showToast(language === 'bn' ? 'রোগ ও সেবনবিধি মাস্টার আপডেট করা হয়েছে!' : 'Disease master updated!', 'success');
    } else {
      setDiseaseMaster(prev => [cleanedEntry, ...prev]);
      showToast(language === 'bn' ? 'নতুন রোগ ও ঔষধের সেবনবিধি যুক্ত হয়েছে!' : 'New disease master added!', 'success');
    }

    setIsDiseaseModalOpen(false);
    setEditingDisease(null);
  };

  // Delete Disease Master Entry
  const handleDeleteDisease = (id: string, name: string) => {
    if (window.confirm(language === 'bn' ? `আপনি কি নিশ্চিতভাবে "${name}" রোগ মাস্টার রেকর্ড মুছে ফেলতে চান?` : `Delete disease entry "${name}"?`)) {
      setDiseaseMaster(prev => prev.filter(d => d.id !== id));
      showToast(language === 'bn' ? 'রোগ মাস্টার রেকর্ড মুছে ফেলা হয়েছে!' : 'Disease entry deleted!', 'info');
    }
  };

  // Reset Disease Master to default
  const handleResetDiseaseMaster = () => {
    if (window.confirm(language === 'bn' ? 'আপনি কি ডিফল্ট ১৬টি রোগের মাস্টার সেবনবিধি ডাটা রিস্টোর করতে চান?' : 'Restore default 16 disease master entries?')) {
      setDiseaseMaster(INITIAL_DISEASE_MASTER);
      showToast(language === 'bn' ? 'ডিফল্ট রোগ মাস্টার সেবনবিধি রিস্টোর করা হয়েছে!' : 'Default disease master restored!', 'success');
    }
  };

  // Load demo medicines
  const handleLoadDemoMedicines = () => {
    SAMPLE_DEMO_MEDICINES.forEach(item => {
      const exists = products.some(p => p.barcode === item.barcode || p.name.toLowerCase() === item.name.toLowerCase());
      if (!exists) {
        addProduct({
          name: item.name,
          nameBn: item.nameBn,
          generic: item.generic,
          manufacturer: item.manufacturer,
          dosageForm: item.dosageForm,
          strength: item.strength,
          rackLocation: item.rackLocation,
          stripSize: item.stripSize,
          salesPrice: item.salesPrice,
          purchasePrice: item.purchasePrice,
          stock: item.stock,
          reorderLevel: item.reorderLevel,
          unit: item.unit,
          barcode: item.barcode,
          batchNumber: item.batchNumber,
          expDate: item.expDate,
          categoryId: 'cat-medicine',
          categoryName: 'Medicine',
          sku: `SKU-${item.barcode}`,
          discount: 0,
          discountType: 'percentage',
          diseases: item.diseases,
          dosageSchedule: item.dosageSchedule,
          mealTiming: item.mealTiming,
          duration: item.duration,
          instructions: item.instructions,
        });
      }
    });
    showToast(language === 'bn' ? '১০টি প্রয়োজনীয় ঔষধ ও সেবনবিধি ডেমো ক্যাটালগে যুক্ত হয়েছে!' : 'Demo medicines with dosages loaded!', 'success');
  };

  // Helper: check expiry status
  const getExpiryBadge = (expDate?: string) => {
    if (!expDate) {
      return (
        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
          {language === 'bn' ? 'মেয়াদ দেওয়া নেই' : 'No Expiry'}
        </span>
      );
    }
    const exp = new Date(expDate);
    const diffTime = exp.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="text-xs px-2 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-400 font-bold flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          {language === 'bn' ? `মেয়াদোত্তীর্ণ (${Math.abs(diffDays)} দিন আগে)` : `Expired (${Math.abs(diffDays)}d ago)`}
        </span>
      );
    } else if (diffDays <= 90) {
      return (
        <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-bold flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {language === 'bn' ? `${diffDays} দিন বাকি` : `${diffDays} days left`}
        </span>
      );
    } else {
      return (
        <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-medium">
          {expDate}
        </span>
      );
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* 1. Top Header Banner with Navigation Tabs */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-800 to-cyan-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-15 pointer-events-none">
          <Stethoscope className="w-72 h-72 text-white" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl shadow-xs">
                <Stethoscope className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
                  <span>{language === 'bn' ? 'রোগ ও ঔষধ সেবনবিধি মাস্টার' : 'Disease & Medicine Dosage Master'}</span>
                </h1>
                <p className="text-emerald-100 text-xs sm:text-sm font-medium mt-0.5">
                  {language === 'bn'
                    ? 'কোন রোগের কোন ঔষধ দিনে কয়বার খেতে হবে তার সম্পূর্ণ নির্দেশিকা ও তাৎক্ষণিক অনুসন্ধান'
                    : 'Disease-wise medicine lookup, daily frequency, meal timing & dosage guidelines'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl font-bold text-sm backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-95 shadow-xs"
              title="রোগের ক্যাটাগরি যুক্ত বা ডিলিট করুন"
            >
              <Tags className="w-4 h-4" />
              <span>{language === 'bn' ? 'ক্যাটাগরি যুক্ত / ডিলিট' : 'Manage Categories'}</span>
              <span className="px-1.5 py-0.5 rounded-full text-xs font-mono bg-white/20 text-white font-bold ml-0.5">
                {diseaseCategories.filter(c => c.id !== 'ALL').length}
              </span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddDiseaseModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{language === 'bn' ? '+ নতুন রোগ ও সেবনবিধি যোগ' : '+ Add Disease Protocol'}</span>
            </button>
          </div>
        </div>

        {/* 3 Navigation Sub-tabs: Disease Search, Category List & Disease Master Protocols */}
        <div className="flex items-center gap-2 mt-5 border-t border-white/20 pt-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubView('diseases')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeSubView === 'diseases'
                ? 'bg-white text-emerald-900 shadow-md scale-102'
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>{language === 'bn' ? 'রোগ অনুযায়ী ঔষধ ও সেবনবিধি' : 'Disease & Dosage Search'}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-600 text-white font-extrabold ml-1">
              {diseaseMaster.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeSubView === 'categories'
                ? 'bg-white text-emerald-900 shadow-md scale-102'
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            <Tags className="w-4 h-4" />
            <span>{language === 'bn' ? 'ক্যাটাগরি তালিকা (Category List)' : 'Category List'}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-600 text-white font-extrabold ml-1">
              {diseaseCategories.filter(c => c.id !== 'ALL').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('master')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeSubView === 'master'
                ? 'bg-white text-emerald-900 shadow-md scale-102'
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{language === 'bn' ? 'রোগের তালিকা ও প্রোটোকল কনফিগারেশন' : 'Disease Master Protocols'}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-600 text-white font-extrabold ml-1">
              {diseaseMaster.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBVIEW 1: DISEASE SEARCH & DOSAGE GUIDE (রোগ অনুযায়ী ঔষধ ও সেবনবিধি) */}
      {/* ========================================================================= */}
      {activeSubView === 'diseases' && (
        <div className="space-y-4">
          {/* Prominent Disease Search Box */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                    {language === 'bn' ? 'রোগের নাম দিয়ে ঔষধ ও সেবনবিধি খুঁজুন' : 'Search Medicines & Dosages by Disease'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'bn'
                      ? 'যেকোনো রোগের নাম বা লক্ষণ লিখে সার্চ করলেই সেই রোগের যাবতীয় ঔষধ ও এক দিনে কয়বার খাওয়ার নিয়ম দেখতে পাবেন।'
                      : 'Type any disease or symptom to instantly see recommended medicines, daily doses & meal timings.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'প্রিন্ট নির্দেশিকা' : 'Print Guide'}</span>
                </button>
              </div>
            </div>

            {/* Input */}
            <div className="relative">
              <Search className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400" />
              <input
                type="text"
                autoFocus
                value={diseaseSearchQuery}
                onChange={e => setDiseaseSearchQuery(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'রোগের নাম লিখুন (যেমন: জ্বর, গ্যাস্ট্রিক, সর্দি, কাশি, মাথাব্যথা, ডায়রিয়া, বমি, এলার্জি, দাঁতের ব্যথা, প্রেশার, ডায়াবেটিস, দুর্বলতা...)'
                    : 'Search by disease name or symptom (e.g., Fever, Gastric, Cough, Headache, Diarrhea, Allergy, Toothache, Blood Pressure...)'
                }
                className="w-full pl-12 pr-10 py-3.5 bg-slate-50 dark:bg-slate-800/90 border-2 border-purple-200 dark:border-purple-800/80 rounded-2xl text-base font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-600 transition-all shadow-inner"
              />
              {diseaseSearchQuery && (
                <button
                  type="button"
                  onClick={() => setDiseaseSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Category Filter Bar with View Mode Toggle */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Tags className="w-3.5 h-3.5 text-purple-600" />
                <span>ক্যাটাগরি অনুযায়ী ফিল্টার:</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCategoryViewStyle('chips')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs ${
                    categoryViewStyle === 'chips'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 font-semibold'
                  }`}
                >
                  চিপস ভিউ
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryViewStyle('list')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs ${
                    categoryViewStyle === 'list'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 font-semibold'
                  }`}
                >
                  লিস্ট ভিউ ({diseaseCategories.filter(c => c.id !== 'ALL').length})
                </button>
              </div>
            </div>

            {/* View Mode 1: Chips View */}
            {categoryViewStyle === 'chips' ? (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                {diseaseCategories.map(cat => (
                  <div key={cat.id} className="relative group shrink-0 flex items-center">
                    <button
                      type="button"
                      onClick={() => setSelectedDiseaseCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedDiseaseCategory === cat.id
                          ? 'bg-purple-700 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{cat.nameBn}</span>
                    </button>
                    {cat.id !== 'ALL' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(cat.id);
                        }}
                        title={`"${cat.nameBn}" ক্যাটাগরি ডিলিট করুন`}
                        className="ml-0.5 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Quick Add / Manage Category Button */}
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl font-bold text-xs bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all shadow-2xs shrink-0"
                  title="নতুন ক্যাটাগরি যুক্ত বা ডিলিট করুন"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{language === 'bn' ? '+ নতুন ক্যাটাগরি' : '+ Add Category'}</span>
                </button>
              </div>
            ) : (
              /* View Mode 2: List View */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
                {diseaseCategories.map(cat => {
                  const diseaseCount = getDiseasesForCategory(cat).length;
                  const isSelected = selectedDiseaseCategory === cat.id;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedDiseaseCategory(cat.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-700 text-white border-purple-800 shadow-sm ring-2 ring-purple-400/40'
                          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Tag className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-purple-200' : 'text-purple-600 dark:text-purple-400'}`} />
                        <span className="font-bold text-xs truncate">{cat.nameBn}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                          }`}
                        >
                          {cat.id === 'ALL' ? `${diseaseMaster.length}টি` : `${diseaseCount}টি`}
                        </span>
                        {cat.id !== 'ALL' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(cat.id);
                            }}
                            title={`"${cat.nameBn}" ক্যাটাগরি ডিলিট করুন`}
                            className={`p-1 rounded-lg transition-colors cursor-pointer ${
                              isSelected
                                ? 'text-white/70 hover:text-white hover:bg-white/20'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            }`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Disease Search Results Cards */}
          {filteredDiseases.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <HelpCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === 'bn' ? `"${diseaseSearchQuery}" রোগের তথ্য পাওয়া যায়নি!` : `No disease found matching "${diseaseSearchQuery}"`}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
                {language === 'bn'
                  ? 'আপনি কি এই রোগের জন্য নতুন সেবনবিধি ও ঔষধ তালিকা যুক্ত করতে চান? নিচের বাটনে ক্লিক করে যোগ করতে পারেন।'
                  : 'Would you like to add a new protocol for this disease? Click below to add.'}
              </p>
              <button
                type="button"
                onClick={handleOpenAddDiseaseModal}
                className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-sm shadow-md transition-colors cursor-pointer"
              >
                + নতুন রোগের সেবনবিধি যোগ করুন
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDiseases.map(dis => (
                <div
                  key={dis.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-md"
                >
                  {/* Disease Card Header */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-50 via-slate-50 to-white dark:from-purple-950/30 dark:via-slate-900 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="p-1.5 bg-purple-600 text-white rounded-lg shadow-xs">
                          <Stethoscope className="w-4 h-4" />
                        </span>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                          {dis.diseaseNameBn}
                        </h2>
                        {dis.diseaseName && dis.diseaseName !== dis.diseaseNameBn && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 font-semibold rounded-md">
                            {dis.diseaseName}
                          </span>
                        )}
                        <span className="text-xs px-2.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-full">
                          {dis.categoryBn || dis.category}
                        </span>
                      </div>

                      {dis.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {dis.description}
                        </p>
                      )}

                      {/* Symptoms tags */}
                      {Array.isArray(dis.symptoms) && dis.symptoms.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[11px] font-bold text-slate-400">লক্ষণসমূহ:</span>
                          {dis.symptoms.map((sym, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2 py-0.3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md font-medium"
                            >
                              {sym}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditDiseaseModal(dis)}
                        className="p-2 text-slate-600 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl transition-colors cursor-pointer text-xs font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                        title="রোগ ও ঔষধের সেবনবিধি সম্পাদনা করুন"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>এডিট</span>
                      </button>
                    </div>
                  </div>

                  {/* Recommended Medicines & Dosage Instructions Table */}
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-emerald-600" />
                        <span>নির্ধারিত ঔষধসমূহ ও এক দিনে কয়বার খাওয়ার নিয়ম ({dis.recommendedMedicines.length}টি ঔষধ)</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {dis.recommendedMedicines.map((med, mIdx) => {
                        const inStoreProduct = findProductStock(med.medicineName, med.genericName);
                        const isAvailable = inStoreProduct && inStoreProduct.stock > 0;
                        const isLow = inStoreProduct && inStoreProduct.stock <= inStoreProduct.reorderLevel;

                        return (
                          <div
                            key={mIdx}
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            {/* Medicine Details */}
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-base text-slate-900 dark:text-white">
                                  {med.medicineName}
                                </span>
                                {med.strength && (
                                  <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold rounded">
                                    {med.strength}
                                  </span>
                                )}
                                {med.dosageForm && (
                                  <span className="text-[11px] px-2 py-0.5 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 font-semibold rounded">
                                    {med.dosageForm}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-wrap text-xs">
                                <span className="font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-1 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md">
                                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                                  <span>জেনেরিক: {med.genericName || inStoreProduct?.generic || '-'}</span>
                                </span>

                                {(med.manufacturer || inStoreProduct?.manufacturer) && (
                                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                    <span>কোম্পানি: {med.manufacturer || inStoreProduct?.manufacturer}</span>
                                  </span>
                                )}

                                {(med.batchNumber || inStoreProduct?.batchNumber) && (
                                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                    ব্যাচ: {med.batchNumber || inStoreProduct?.batchNumber}
                                  </span>
                                )}

                                {(med.categoryName || inStoreProduct?.categoryName) && (
                                  <span className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                    ক্যাটাগরি: {med.categoryName || inStoreProduct?.categoryName}
                                  </span>
                                )}
                              </div>

                              {/* Dosage Highlights: দিনে কয়বার + খাওয়ার নিয়ম + কত দিন */}
                              <div className="flex items-center gap-2 flex-wrap pt-1">
                                {/* এক দিনে কয়বার */}
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-black shadow-2xs">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{med.dosageSchedule}</span>
                                </div>

                                {/* খাওয়ার নিয়ম */}
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 rounded-lg text-xs font-bold border border-amber-300/60 dark:border-amber-700/60">
                                  <span>🍽️ {med.mealTiming}</span>
                                </div>

                                {/* কত দিন */}
                                {med.duration && (
                                  <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-200 rounded-lg text-xs font-bold">
                                    <Calendar className="w-3 h-3 text-blue-600" />
                                    <span>মেয়াদ: {med.duration}</span>
                                  </div>
                                )}
                              </div>

                              {/* Instructions & Precautions */}
                              {med.instructions && (
                                <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 leading-relaxed">
                                  <strong className="text-slate-800 dark:text-slate-100">নির্দেশনা:</strong> {med.instructions}
                                </p>
                              )}

                              {med.precautions && (
                                <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                                  <strong>সতর্কতা:</strong> {med.precautions}
                                </p>
                              )}
                            </div>

                            {/* Store Stock & Instant POS Sale Button */}
                            <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700/80 pt-3 md:pt-0 md:pl-4">
                              {inStoreProduct ? (
                                <div className="text-left md:text-right space-y-0.5">
                                  <div className="flex items-center gap-1 text-xs font-bold">
                                    {isAvailable ? (
                                      <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span>{inStoreProduct.stock} পিস স্টকে আছে</span>
                                      </span>
                                    ) : (
                                      <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                                        <AlertTriangle className="w-4 h-4 text-red-600" />
                                        <span>স্টকে নেই</span>
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-xs text-slate-500 font-medium">
                                    মূল্য: <span className="font-extrabold text-slate-900 dark:text-white">{companySettings.currencySymbol}{inStoreProduct.salesPrice}</span>/pc
                                  </div>

                                  {inStoreProduct.rackLocation && (
                                    <div className="text-[11px] text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1 md:justify-end">
                                      <MapPin className="w-3 h-3" />
                                      <span>{inStoreProduct.rackLocation}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-slate-400 italic">
                                  দোকান স্টকে সরাসরি যুক্ত নেই
                                </div>
                              )}

                              {/* Action: Sell / Add to POS */}
                              <button
                                type="button"
                                onClick={() => setActiveTab('pos')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                <span>বিক্রি করুন (POS)</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}



      {/* ========================================================================= */}
      {/* SUBVIEW 2: CATEGORY LIST VIEW (ক্যাটাগরি তালিকা ভিউ) */}
      {/* ========================================================================= */}
      {activeSubView === 'categories' && (
        <div className="space-y-4">
          {/* Top Banner / Summary Card for Categories */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <Tags className="w-5 h-5 text-purple-600" />
                <span>রোগের ক্যাটাগরি তালিকা (Disease Categories List)</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
                  মোট {diseaseCategories.filter(c => c.id !== 'ALL').length}টি ক্যাটাগরি
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ক্যাটাগরি অনুযায়ী অন্তর্ভুক্ত রোগের তালিকা ও সেবনবিধি দেখুন অথবা নতুন ক্যাটাগরি যুক্ত/ডিলিট করুন।
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleResetCategories}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors"
                title="ডিফল্ট ক্যাটাগরি রিস্টোর"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ডিফল্ট রিস্টোর</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ নতুন ক্যাটাগরি যুক্ত করুন</span>
              </button>
            </div>
          </div>

          {/* Category List Search Box */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={categorySearchQuery}
              onChange={e => setCategorySearchQuery(e.target.value)}
              placeholder="ক্যাটাগরির নাম লিখে খুঁজুন (যেমন: জ্বর, পরিপাকতন্ত্র, শ্বাসতন্ত্র, রক্তচাপ, অ্যালার্জি...)"
              className="w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
            />
            {categorySearchQuery && (
              <button
                type="button"
                onClick={() => setCategorySearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category List Table & Cards */}
          {filteredCategoriesList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Tags className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                "{categorySearchQuery}" নামের কোনো ক্যাটাগরি পাওয়া যায়নি
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                আপনি চাইলে এখনই এই নামে নতুন ক্যাটাগরি তৈরি করতে পারেন।
              </p>
              <button
                type="button"
                onClick={() => {
                  setNewCatNameBn(categorySearchQuery);
                  setIsCategoryModalOpen(true);
                }}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                + "{categorySearchQuery}" ক্যাটাগরি তৈরি করুন
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-16 text-center">ক্রমিক</th>
                      <th className="py-3.5 px-4 min-w-[200px]">ক্যাটাগরির নাম (বাংলা ও ইংরেজি)</th>
                      <th className="py-3.5 px-4 text-center w-36">অন্তর্ভুক্ত রোগ</th>
                      <th className="py-3.5 px-4 min-w-[280px]">রোগসমূহের তালিকা</th>
                      <th className="py-3.5 px-4 text-center w-52">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredCategoriesList.map((cat, idx) => {
                      const diseasesUnderCat = getDiseasesForCategory(cat);
                      const isAll = cat.id === 'ALL';

                      return (
                        <tr
                          key={cat.id}
                          className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors group"
                        >
                          {/* Serial */}
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-xs text-slate-500">
                            {idx + 1}
                          </td>

                          {/* Category Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                                <Tags className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                                  <span>{cat.nameBn}</span>
                                  {isAll && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                      ডিফল্ট
                                    </span>
                                  )}
                                </div>
                                {cat.name && cat.name !== cat.nameBn && (
                                  <div className="text-xs text-slate-400 font-medium">
                                    {cat.name}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Total Diseases Badge */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200">
                              <Activity className="w-3 h-3" />
                              <span>{diseasesUnderCat.length}টি রোগ</span>
                            </span>
                          </td>

                          {/* Diseases under category tags */}
                          <td className="py-3.5 px-4">
                            {diseasesUnderCat.length > 0 ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {diseasesUnderCat.slice(0, 4).map((d, dIdx) => (
                                  <span
                                    key={dIdx}
                                    onClick={() => {
                                      setSelectedDiseaseCategory(cat.id);
                                      setDiseaseSearchQuery(d.diseaseNameBn);
                                      setActiveSubView('diseases');
                                    }}
                                    className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-purple-100 dark:bg-slate-800 dark:hover:bg-purple-950/70 text-slate-700 hover:text-purple-700 dark:text-slate-300 dark:hover:text-purple-300 cursor-pointer transition-colors"
                                    title="ক্লিক করে এই রোগের ঔষধ ও সেবনবিধি দেখুন"
                                  >
                                    {d.diseaseNameBn}
                                  </span>
                                ))}
                                {diseasesUnderCat.length > 4 && (
                                  <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 px-1.5 py-0.5">
                                    +{diseasesUnderCat.length - 4}টি আরো
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">
                                কোনো রোগ যুক্ত করা হয়নি
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* View Diseases Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDiseaseCategory(cat.id);
                                  setDiseaseSearchQuery('');
                                  setActiveSubView('diseases');
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                                title="এই ক্যাটাগরির সমস্ত রোগ ও সেবনবিধি দেখুন"
                              >
                                <Search className="w-3.5 h-3.5" />
                                <span>ঔষধ দেখুন</span>
                              </button>

                              {/* Delete button (if not ALL) */}
                              {!isAll ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                                  title={`"${cat.nameBn}" ক্যাটাগরি ডিলিট করুন`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBVIEW 3: DISEASE MASTER CONFIGURATION (রোগ মাস্টার কনফিগারেশন) */}
      {/* ========================================================================= */}
      {activeSubView === 'master' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-purple-600" />
                <span>রোগ ও সেবনবিধি মাস্টার কনফিগারেশন ({diseaseMaster.length}টি রোগ)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                এখানে আপনি যেকোনো রোগের নাম, তার অধীনে প্রস্তাবিত ঔষধের তালিকা এবং প্রতিদিন কত বার সেব্য তা পরিবর্তন ও নতুন রোগ যোগ করতে পারেন।
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-3.5 py-2 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 cursor-pointer flex items-center gap-1.5 transition-colors"
                title="রোগের ক্যাটাগরি যুক্ত বা ডিলিট করুন"
              >
                <Tags className="w-3.5 h-3.5" />
                <span>ক্যাটাগরি যুক্ত / ডিলিট ({diseaseCategories.filter(c => c.id !== 'ALL').length})</span>
              </button>
              <button
                type="button"
                onClick={handleResetDiseaseMaster}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ডিফল্ট ডাটা রিস্টোর</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAddDiseaseModal}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ নতুন রোগ যুক্ত করুন</span>
              </button>
            </div>
          </div>

          {/* Master Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">রোগের নাম (বাংলা ও ইংরেজি)</th>
                    <th className="py-3 px-3">ক্যাটাগরি</th>
                    <th className="py-3 px-3">নির্ধারিত ঔষধসমূহ ও সেবনবিধি</th>
                    <th className="py-3 px-4 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {diseaseMaster.map(dis => (
                    <tr key={dis.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {dis.diseaseNameBn}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          {dis.diseaseName}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs font-bold px-2 py-0.5 bg-purple-50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 rounded-md">
                          {dis.categoryBn || dis.category}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          {dis.recommendedMedicines.map((m, i) => (
                            <div key={i} className="text-xs flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800 dark:text-slate-200">• {m.medicineName}</span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded">
                                {m.dosageSchedule}
                              </span>
                              <span className="text-slate-400">({m.mealTiming})</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditDiseaseModal(dis)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                            title="এডিট"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDisease(dis.id, dis.diseaseNameBn)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: (Add New Medicine) is removed per user request */}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT DISEASE MASTER PROTOCOL (নতুন রোগ ও সেবনবিধি মাস্টার) */}
      {/* ========================================================================= */}
      {isDiseaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
            <div className="bg-gradient-to-r from-purple-800 to-indigo-800 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Stethoscope className="w-6 h-6" />
                <h2 className="text-lg font-bold">
                  {editingDisease ? 'রোগ ও সেবনবিধি প্রোটোকল সম্পাদনা' : 'নতুন রোগ ও সেবনবিধি প্রোটোকল তৈরি'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsDiseaseModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDiseaseMaster} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Disease Name Bangla */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    রোগের নাম (বাংলায়) *
                  </label>
                  <input
                    type="text"
                    required
                    value={diseaseFormData.diseaseNameBn}
                    onChange={e => setDiseaseFormData({ ...diseaseFormData, diseaseNameBn: e.target.value })}
                    placeholder="যেমনঃ জ্বর ও শরীর ব্যথা"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                  />
                </div>

                {/* Disease Name English */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    রোগের নাম (ইংরেজিতে)
                  </label>
                  <input
                    type="text"
                    value={diseaseFormData.diseaseName}
                    onChange={e => setDiseaseFormData({ ...diseaseFormData, diseaseName: e.target.value })}
                    placeholder="e.g. Fever & Body Ache"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      ক্যাটাগরি *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-[11px] text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      title="নতুন ক্যাটাগরি যুক্ত বা ডিলিট করুন"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                      <span>ক্যাটাগরি যুক্ত / ডিলিট</span>
                    </button>
                  </div>
                  <select
                    value={diseaseFormData.category}
                    onChange={e => {
                      const selected = diseaseCategories.find(c => c.id === e.target.value);
                      setDiseaseFormData({
                        ...diseaseFormData,
                        category: e.target.value,
                        categoryBn: selected ? selected.nameBn : e.target.value,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer font-medium"
                  >
                    {diseaseCategories.filter(c => c.id !== 'ALL').map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nameBn} {c.name && c.name !== c.nameBn ? `(${c.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Symptoms */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    লক্ষণসমূহ (কমা দিয়ে লিখুন)
                  </label>
                  <input
                    type="text"
                    value={Array.isArray(diseaseFormData.symptoms) ? diseaseFormData.symptoms.join(', ') : ''}
                    onChange={e => setDiseaseFormData({ ...diseaseFormData, symptoms: e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0) })}
                    placeholder="উচ্চ তাপমাত্রা, মাথাব্যথা, কাঁপুনি"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    রোগের বিবরণ বা নোট
                  </label>
                  <input
                    type="text"
                    value={diseaseFormData.description || ''}
                    onChange={e => setDiseaseFormData({ ...diseaseFormData, description: e.target.value })}
                    placeholder="সাধারণ ভাইরাল জ্বর বা ঋতু পরিবর্তনের সমস্যা..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Medicines List Editor for this disease */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-purple-900 dark:text-purple-300">
                    এই রোগের ঔষধসমূহ ও এক দিনে খাওয়ার নিয়ম ({diseaseFormData.recommendedMedicines.length}টি)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDiseaseFormData({
                        ...diseaseFormData,
                        recommendedMedicines: [
                          ...diseaseFormData.recommendedMedicines,
                          {
                            medicineName: '',
                            genericName: '',
                            dosageForm: 'Tablet',
                            strength: '',
                            dosageSchedule: '১ + ০ + ১ (দিনে ২ বার)',
                            frequencyPerDay: 2,
                            mealTiming: 'খাওয়ার পর',
                            duration: '৩ দিন',
                            instructions: '',
                            precautions: '',
                          }
                        ]
                      });
                    }}
                    className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-800 dark:text-purple-300 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    + আরেকটি ঔষধ যোগ
                  </button>
                </div>

                {diseaseFormData.recommendedMedicines.map((med, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border-2 border-slate-200 dark:border-slate-700 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 text-purple-600" />
                        <span>ঔষধ #{idx + 1}</span>
                      </span>
                      {diseaseFormData.recommendedMedicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setDiseaseFormData({
                              ...diseaseFormData,
                              recommendedMedicines: diseaseFormData.recommendedMedicines.filter((_, i) => i !== idx)
                            });
                          }}
                          className="text-xs text-rose-600 hover:underline cursor-pointer font-bold"
                        >
                          মুছুন
                        </button>
                      )}
                    </div>

                    {/* 1. Products List Dropdown Selector */}
                    <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 space-y-1.5">
                      <label className="block text-xs font-extrabold text-teal-900 dark:text-teal-200 flex items-center justify-between flex-wrap gap-1">
                        <span className="flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-teal-600" />
                          <span>Products List থেকে ঔষধ #{idx + 1} নির্বাচন করুন:</span>
                        </span>
                        {products.length > 0 && (
                          <span className="text-[11px] text-teal-700 dark:text-teal-300 font-bold bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded-full font-mono">
                            ইনভেন্টরিতে মোট {products.length}টি পণ্য রয়েছে
                          </span>
                        )}
                      </label>
                      <select
                        value={products.find(p => p.name.trim().toLowerCase() === med.medicineName.trim().toLowerCase())?.id || ''}
                        onChange={e => {
                          const selectedProd = products.find(p => p.id === e.target.value);
                          if (selectedProd) {
                            applyProductToMedicine(selectedProd, idx);
                          }
                        }}
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border-2 border-teal-500/80 dark:border-teal-600 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-xs"
                      >
                        <option value="">-- Products List থেকে সিলেক্ট করুন (বা নিচে সরাসরি লিখুন) --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.strength ? `(${p.strength})` : ''} • জেনেরিক: {p.generic || 'N/A'} • কোম্পানি: {p.manufacturer || 'N/A'} • ব্যাচ: {p.batchNumber || 'N/A'} • ক্যাটাগরি: {p.categoryName || 'Medicine'} • স্টক: {p.stock} (৳{p.salesPrice})
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-teal-700 dark:text-teal-300 font-medium">
                        💡 Products List থেকে ঔষধ সিলেক্ট করলে Generic, Batch No, Category এবং Brand / Company স্বয়ংক্রিয়ভাবে নিচে পূরণ হয়ে যাবে।
                      </p>
                    </div>

                    {/* Matched Store Product Live Badge with Auto-filled Generic, Company, Batch & Category */}
                    {(med.genericName || med.batchNumber || med.categoryName || med.manufacturer || med.medicineName) && (
                      <div className="p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-indigo-950/40 rounded-xl border border-teal-300 dark:border-teal-700/70 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between text-xs font-bold text-teal-950 dark:text-teal-200 flex-wrap gap-1">
                          <span className="flex items-center gap-1.5 font-extrabold text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Products List থেকে অটো সংগৃহীত তথ্য:</span>
                          </span>
                          {med.stock !== undefined && (
                            <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-md text-[11px] font-mono font-bold">
                              স্টক: {med.stock} | মূল্য: ৳{med.salesPrice || 0}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 border-t border-teal-200/80 dark:border-teal-800/60">
                          <div className="bg-white/90 dark:bg-slate-800/90 p-2 rounded-lg border border-purple-200 dark:border-purple-900/60">
                            <span className="text-[10px] text-purple-700 dark:text-purple-400 font-black block">Generic (জেনেরিক):</span>
                            <span className="font-bold text-purple-950 dark:text-purple-200 truncate block">{med.genericName || '—'}</span>
                          </div>
                          <div className="bg-white/90 dark:bg-slate-800/90 p-2 rounded-lg border border-teal-200 dark:border-teal-900/60">
                            <span className="text-[10px] text-teal-700 dark:text-teal-400 font-black block">Batch No (ব্যাচ):</span>
                            <span className="font-mono font-bold text-teal-950 dark:text-teal-200 truncate block">{med.batchNumber || '—'}</span>
                          </div>
                          <div className="bg-white/90 dark:bg-slate-800/90 p-2 rounded-lg border border-blue-200 dark:border-blue-900/60">
                            <span className="text-[10px] text-blue-700 dark:text-blue-400 font-black block">Category (ক্যাটাগরি):</span>
                            <span className="font-bold text-blue-950 dark:text-blue-200 truncate block">{med.categoryName || '—'}</span>
                          </div>
                          <div className="bg-white/90 dark:bg-slate-800/90 p-2 rounded-lg border border-amber-200 dark:border-amber-900/60">
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-black block">Brand / Company:</span>
                            <span className="font-bold text-amber-950 dark:text-amber-200 truncate block">{med.manufacturer || '—'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Datalist for autocomplete typing from Products List */}
                    <datalist id={`products-datalist-${idx}`}>
                      {products.map(p => (
                        <option key={p.id} value={p.name}>
                          {p.name} {p.strength ? `(${p.strength})` : ''} - {p.generic || ''} ({p.manufacturer || ''})
                        </option>
                      ))}
                    </datalist>

                    {/* 2. Auto-filled Medicine Details: Row 1 (Name, Generic, Brand/Company) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                          ঔষধের নাম (Brand Name) *
                        </label>
                        <input
                          type="text"
                          required
                          list={`products-datalist-${idx}`}
                          placeholder="ঔষধের নাম (যেমন Napa Extra)"
                          value={med.medicineName}
                          onChange={e => {
                            const val = e.target.value;
                            const match = products.find(p => p.name.trim().toLowerCase() === val.trim().toLowerCase());
                            if (match) {
                              applyProductToMedicine(match, idx);
                            } else {
                              const updated = [...diseaseFormData.recommendedMedicines];
                              updated[idx].medicineName = val;
                              setDiseaseFormData({ ...diseaseFormData, recommendedMedicines: updated });
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-purple-700 dark:text-purple-400 mb-0.5 flex items-center justify-between">
                          <span>জেনেরিক নাম (Generic)</span>
                          <span className="text-[9px] bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 px-1.5 py-0.2 rounded font-bold">
                            অটো পূরণ ✓
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder="জেনেরিক (যেমন Paracetamol)"
                          value={med.genericName}
                          onChange={e => {
                            const updated = [...diseaseFormData.recommendedMedicines];
                            updated[idx].genericName = e.target.value;
                            setDiseaseFormData({ ...diseaseFormData, recommendedMedicines: updated });
                          }}
                          className="w-full px-2.5 py-1.5 bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold text-purple-900 dark:text-purple-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-amber-700 dark:text-amber-400 mb-0.5 flex items-center justify-between">
                          <span>ব্র্যান্ড / কোম্পানি (Brand / Company)</span>
                          <span className="text-[9px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded font-bold">
                            অটো পূরণ ✓
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder="কোম্পানি (যেমন Square, Beximco)"
                          value={med.manufacturer || ''}
                          onChange={e => {
                            const updated = [...diseaseFormData.recommendedMedicines];
                            updated[idx].manufacturer = e.target.value;
                            setDiseaseFormData({ ...diseaseFormData, recommendedMedicines: updated });
                          }}
                          className="w-full px-2.5 py-1.5 bg-amber-50/30 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-medium"
                        />
                      </div>
                    </div>

                    {/* Auto-filled Medicine Details: Row 2 (Category, Batch No, Strength) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-blue-700 dark:text-blue-400 mb-0.5 flex items-center justify-between">
                          <span>ক্যাটাগরি (Category)</span>
                          <span className="text-[9px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-1.5 py-0.2 rounded font-bold">
                            অটো পূরণ ✓
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder="ক্যাটাগরি (যেমন Medicine)"
                          value={med.categoryName || ''}
                          onChange={e => {
                            const updated = [...diseaseFormData.recommendedMedicines];
                            updated[idx].categoryName = e.target.value;
                            setDiseaseFormData({ ...diseaseFormData, recommendedMedicines: updated });
                          }}
                          className="w-full px-2.5 py-1.5 bg-blue-50/30 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-teal-700 dark:text-teal-400 mb-0.5 flex items-center justify-between">
                          <span>ব্যাচ নম্বর (Batch No)</span>
                          <span className="text-[9px] bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 px-1.5 py-0.2 rounded font-bold">
                            অটো পূরণ ✓
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder="ব্যাচ নং (যেমন BX-2024-N01)"
                          value={med.batchNumber || ''}
                          onChange={e => {
                            const updated = [...diseaseFormData.recommendedMedicines];
                            updated[idx].batchNumber = e.target.value;
                            setDiseaseFormData({ ...diseaseFormData, recommendedMedicines: updated });
                          }}
                          className="w-full px-2.5 py-1.5 bg-teal-50/30 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5 flex items-center justify-between">
                          <span>পাওয়ার / শক্তি (Strength)</span>
                          <span className="text-[9px] text-teal-600 font-normal">অটো পূরণ ✓</span>
                        </label>
                        <input
                          type="text"
                          placeholder="পাওয়ার (যেমন 500mg, 20mg)"
                          value={med.strength || ''}
                          onChange={e => {
                            const updated = [...diseaseFormData.recommendedMedicines];
                            updated[idx].strength = e.target.value;
                            setDiseaseFormData({ ...diseaseFormData, recommendedMedicines: updated });
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-medium"
                        />
                      </div>
                    </div>

                    {/* 3. Dosage Schedule, Meal Timing, Duration */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">এক দিনে কয়বার (Schedule) *</label>
                        <input
                          type="text"
                          required
                          placeholder="১ + ০ + ১ (দিনে ২ বার)"
                          value={med.dosageSchedule}
                          onChange={e => {
                            const updated = [...diseaseFormData.recommendedMedicines];
                            updated[idx].dosageSchedule = e.target.value;
                            setDiseaseFormData({ ...diseaseFormData, recommendedMedicines: updated });
                          }}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-600 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-400"
                        />
                        {/* Quick Presets */}
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {['১ + ০ + ১', '১ + ১ + ১', '১ + ০ + ০', '০ + ০ + ১', 'প্রয়োজনে'].map(pr => (
                            <button
                              key={pr}
                              type="button"
                              onClick={() => {
                                const updated = [...diseaseFormData.recommendedMedicines];
                                updated[idx].dosageSchedule = `${pr} (${pr === '১ + ০ + ১' ? 'দিনে ২ বার' : pr === '১ + ১ + ১' ? 'দিনে ৩ বার' : pr === '১ + ০ + ০' ? 'সকালে ১ বার' : pr === '০ + ০ + ১' ? 'রাতে ১ বার' : 'প্রয়োজনে'})`;
                                setDiseaseFormData({ ...diseaseFormData, recommendedMedicines: updated });
                              }}
                              className="text-[10px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 hover:bg-purple-200 dark:hover:bg-purple-900 rounded font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              {pr}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">খাওয়ার সময়</label>
                        <select
                          value={med.mealTiming}
                          onChange={e => {
                            const updated = [...diseaseFormData.recommendedMedicines];
                            updated[idx].mealTiming = e.target.value;
                            setDiseaseFormData({ ...diseaseFormData, recommendedMedicines: updated });
                          }}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs cursor-pointer"
                        >
                          <option value="খাওয়ার পর (ভরা পেটে)">খাওয়ার পর (ভরা পেটে)</option>
                          <option value="খাওয়ার ৩০ মিনিট আগে (খালি পেটে)">খাওয়ার ৩০ মিনিট আগে (খালি পেটে)</option>
                          <option value="খাওয়ার সাথে সাথে">খাওয়ার সাথে সাথে</option>
                          <option value="রাতে ঘুমানোর আগে">রাতে ঘুমানোর আগে</option>
                          <option value="প্রয়োজন অনুযায়ী">প্রয়োজন অনুযায়ী</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">কত দিন (Duration)</label>
                        <input
                          type="text"
                          placeholder="যেমন ৩-৫ দিন"
                          value={med.duration}
                          onChange={e => {
                            const updated = [...diseaseFormData.recommendedMedicines];
                            updated[idx].duration = e.target.value;
                            setDiseaseFormData({ ...diseaseFormData, recommendedMedicines: updated });
                          }}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">বিশেষ নির্দেশনা বা সতর্কতা</label>
                      <input
                        type="text"
                        placeholder="যেমন: প্রচুর পানি পান করুন, চিবিয়ে খাবেন না"
                        value={med.instructions || ''}
                        onChange={e => {
                          const updated = [...diseaseFormData.recommendedMedicines];
                          updated[idx].instructions = e.target.value;
                          setDiseaseFormData({ ...diseaseFormData, recommendedMedicines: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDiseaseModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm rounded-xl shadow-md cursor-pointer"
                >
                  {editingDisease ? 'আপডেট করুন' : 'মাস্টার সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL 3: MANAGE DISEASE CATEGORIES (রোগের ক্যাটাগরি যুক্ত / ডিলিট ব্যবস্থাপনা) */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-teal-800 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Tags className="w-6 h-6 text-purple-200" />
                <div>
                  <h2 className="text-lg font-bold">
                    {language === 'bn' ? 'রোগের ক্যাটাগরি ব্যবস্থাপনা' : 'Disease Categories Master'}
                  </h2>
                  <p className="text-xs text-purple-200">
                    {language === 'bn'
                      ? 'নতুন ক্যাটাগরি যুক্ত করুন অথবা অপ্রয়োজনীয় ক্যাটাগরি ডিলিট করুন'
                      : 'Add new categories or remove unnecessary categories'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* 1. Add New Category Box */}
              <form onSubmit={handleAddCategory} className="p-4 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <FolderPlus className="w-4 h-4 text-purple-600" />
                    <span>নতুন ক্যাটাগরি তৈরি করুন</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ক্যাটাগরির নাম (বাংলায়) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCatNameBn}
                      onChange={e => setNewCatNameBn(e.target.value)}
                      placeholder="যেমন: শিশু ও নবজাতক, চক্ষু রোগ"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Category Name (ইংরেজিতে)
                    </label>
                    <input
                      type="text"
                      value={newCatNameEn}
                      onChange={e => setNewCatNameEn(e.target.value)}
                      placeholder="e.g. Pediatrics, Eye Care"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ ক্যাটাগরি যোগ করুন</span>
                  </button>
                </div>
              </form>

              {/* 2. Existing Categories List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-purple-600" />
                    <span>বর্তমান ক্যাটাগরি তালিকা ({diseaseCategories.length}টি)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleResetCategories}
                    className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>ডিফল্ট রিস্টোর</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-1">
                  {diseaseCategories.map((cat, idx) => {
                    const diseaseCount = diseaseMaster.filter(
                      d => d.category === cat.id || d.categoryBn === cat.nameBn || d.category === cat.name
                    ).length;

                    return (
                      <div
                        key={cat.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-mono text-xs font-extrabold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {cat.nameBn}
                            </div>
                            {cat.name && cat.name !== cat.nameBn && (
                              <div className="text-[11px] text-slate-400 truncate">
                                {cat.name}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
                            {cat.id === 'ALL' ? 'সকল রোগ' : `${diseaseCount}টি রোগ`}
                          </span>

                          {cat.id !== 'ALL' ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                              title={`"${cat.nameBn}" ক্যাটাগরি ডিলিট করুন`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic px-1">
                              ডিফল্ট
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

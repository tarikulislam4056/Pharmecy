import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { LoginScreen } from './components/auth/LoginScreen';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { DayBookView } from './components/daybook/DayBookView';
import { PosSaleView } from './components/sales/PosSaleView';
import { SalesListView } from './components/sales/SalesListView';
import { SalesReturnView } from './components/sales/SalesReturnView';
import { QuotationView } from './components/sales/QuotationView';
import { CustomersView } from './components/crm/CustomersView';
import { DueListView } from './components/crm/DueListView';
import { SuppliersView } from './components/crm/SuppliersView';
import { PurchaseEntryView } from './components/purchase/PurchaseEntryView';
import { PurchaseListView } from './components/purchase/PurchaseListView';
import { PurchaseOrdersView } from './components/purchase/PurchaseOrdersView';
import { PurchaseReturnView } from './components/purchase/PurchaseReturnView';
import { InstallmentView } from './components/installments/InstallmentView';
import { ProductsListView } from './components/products/ProductsListView';
import { MedicineView } from './components/medicine/MedicineView';
import { BatchInventoryView } from './components/products/BatchInventoryView';
import { CategoriesView } from './components/products/CategoriesView';
import { UtilitiesView } from './components/products/UtilitiesView';
import { WarrantyManagementView } from './components/warranties/WarrantyManagementView';
import { ExpensesView } from './components/finance/ExpensesView';
import { WalletsView } from './components/finance/WalletsView';
import { HrPayrollView } from './components/finance/HrPayrollView';
import { ReportsView, ReportKind } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { UsersView } from './components/users/UsersView';
import { ActivityLogView } from './components/common/ActivityLogView';

// Modals
import { PrintInvoiceModal } from './components/common/PrintInvoiceModal';
import { PaymentInModal } from './components/sales/PaymentInModal';
import { PaymentOutModal } from './components/purchase/PaymentOutModal';
import { PartyModal } from './components/crm/PartyModal';
import { ProductModal } from './components/products/ProductModal';
import { ExpenseModal } from './components/finance/ExpenseModal';
import { CashAdjustmentModal } from './components/finance/CashAdjustmentModal';
import { KeyboardShortcutsModal } from './components/common/KeyboardShortcutsModal';

import { AccessDeniedView } from './components/common/AccessDeniedView';
import { isTabAllowed } from './utils/permissions';

// Toast and Icons
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Code2, Phone, MapPin } from 'lucide-react';
import { Party, PartyType, Product, PurchaseInvoice } from './types';

const MainLayout: React.FC = () => {
  const { activeTab, toastMessage, setActiveTab, currentUser, companySettings } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modal States
  const [isPaymentInOpen, setIsPaymentInOpen] = useState(false);
  const [isPaymentOutOpen, setIsPaymentOutOpen] = useState(false);
  const [paymentInPartyId, setPaymentInPartyId] = useState<string | undefined>(undefined);
  const [paymentOutSupplierId, setPaymentOutSupplierId] = useState<string | undefined>(undefined);

  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [partyToEdit, setPartyToEdit] = useState<Party | null>(null);
  const [partyDefaultType, setPartyDefaultType] = useState<PartyType>('CUSTOMER');

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCashAdjustModalOpen, setIsCashAdjustModalOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);

  const [purchaseInvoiceToEdit, setPurchaseInvoiceToEdit] = useState<PurchaseInvoice | null>(null);

  // Active Report Category Selection
  const [activeReportKind, setActiveReportKind] = useState<ReportKind>('summary');

  // Keyboard Shortcuts Listener for Power Users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable || target.tagName === 'SELECT');

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isAlt = e.altKey;

      // Shift + ? or F1 to open shortcuts modal
      if ((e.key === '?' && e.shiftKey && !isInput) || e.key === 'F1') {
        e.preventDefault();
        setIsKeyboardShortcutsOpen(prev => !prev);
        return;
      }

      // Escape to close keyboard shortcuts modal if open
      if (e.key === 'Escape' && isKeyboardShortcutsOpen) {
        setIsKeyboardShortcutsOpen(false);
        return;
      }

      // Shortcut combinations with Ctrl, Cmd, or Alt
      if (isCtrlOrCmd || isAlt) {
        const key = e.key.toLowerCase();

        // Ctrl/Alt + N => New Sale (POS)
        if (key === 'n' && !e.shiftKey) {
          e.preventDefault();
          setActiveTab('pos');
          return;
        }

        // Ctrl/Alt + P => Products List
        if (key === 'p' && !e.shiftKey) {
          e.preventDefault();
          setActiveTab('products-list');
          return;
        }

        // Ctrl/Alt + Shift + P => Purchase Entry
        if (key === 'p' && e.shiftKey) {
          e.preventDefault();
          setActiveTab('purchase-entry');
          return;
        }

        // Ctrl/Alt + D => Dashboard
        if (key === 'd') {
          e.preventDefault();
          setActiveTab('dashboard');
          return;
        }

        // Ctrl/Alt + B => Day Book
        if (key === 'b') {
          e.preventDefault();
          setActiveTab('daybook');
          return;
        }

        // Ctrl/Alt + S => Sales List
        if (key === 's') {
          e.preventDefault();
          setActiveTab('sales-list');
          return;
        }

        // Ctrl/Alt + R => Reports
        if (key === 'r') {
          e.preventDefault();
          setActiveTab('reports');
          return;
        }

        // Ctrl/Alt + E => New Expense Modal
        if (key === 'e') {
          e.preventDefault();
          setIsExpenseModalOpen(true);
          return;
        }

        // Ctrl/Alt + I => Payment In Modal
        if (key === 'i') {
          e.preventDefault();
          handleOpenPaymentIn();
          return;
        }

        // Ctrl/Alt + O => Payment Out Modal
        if (key === 'o') {
          e.preventDefault();
          handleOpenPaymentOut();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);

  // Handlers
  const handleOpenPaymentIn = (partyId?: string) => {
    setPaymentInPartyId(partyId);
    setIsPaymentInOpen(true);
  };

  const handleOpenPaymentOut = (supplierId?: string) => {
    setPaymentOutSupplierId(supplierId);
    setIsPaymentOutOpen(true);
  };

  const handleOpenAddParty = (type: PartyType = 'CUSTOMER') => {
    setPartyToEdit(null);
    setPartyDefaultType(type);
    setIsPartyModalOpen(true);
  };

  const handleOpenEditParty = (party: Party) => {
    setPartyToEdit(party);
    setPartyDefaultType(party.type);
    setIsPartyModalOpen(true);
  };

  const handleOpenAddProduct = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setProductToEdit(prod);
    setIsProductModalOpen(true);
  };

  const handleSelectReport = (reportType: ReportKind) => {
    setActiveReportKind(reportType);
  };

  // Render view based on tab
  const renderActiveView = () => {
    if (!isTabAllowed(currentUser, activeTab)) {
      return (
        <AccessDeniedView
          moduleName={activeTab}
          onNavigate={(targetTab) => setActiveTab(targetTab)}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            onOpenPaymentInModal={() => handleOpenPaymentIn()}
            onOpenPaymentOutModal={() => handleOpenPaymentOut()}
            onOpenCashAdjustModal={() => setIsCashAdjustModalOpen(true)}
            onOpenProductModal={handleOpenAddProduct}
            onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
            onOpenKeyboardShortcuts={() => setIsKeyboardShortcutsOpen(true)}
          />
        );

      case 'daybook':
        return <DayBookView />;

      case 'pos':
        return (
          <PosSaleView
            onOpenNewCustomerModal={() => handleOpenAddParty('CUSTOMER')}
          />
        );

      case 'sales-list':
        return (
          <SalesListView
            initialSubTab="active"
            onOpenPaymentInModal={handleOpenPaymentIn}
          />
        );

      case 'deleted-invoices':
        return (
          <SalesListView
            initialSubTab="deleted"
            onOpenPaymentInModal={handleOpenPaymentIn}
          />
        );

      case 'sales-returns':
        return <SalesReturnView />;

      case 'quotations':
        return <QuotationView />;

      case 'customers':
        return (
          <CustomersView
            onOpenAddModal={() => handleOpenAddParty('CUSTOMER')}
            onOpenEditModal={handleOpenEditParty}
            onOpenPaymentInModal={handleOpenPaymentIn}
          />
        );

      case 'due-list':
        return (
          <DueListView
            onOpenPaymentInModal={handleOpenPaymentIn}
            onOpenPaymentOutModal={handleOpenPaymentOut}
          />
        );

      case 'suppliers':
        return (
          <SuppliersView
            onOpenAddModal={() => handleOpenAddParty('SUPPLIER')}
            onOpenEditModal={handleOpenEditParty}
            onOpenPaymentOutModal={handleOpenPaymentOut}
          />
        );

      case 'purchase-entry':
        return (
          <PurchaseEntryView
            initialData={purchaseInvoiceToEdit}
            onCancelEdit={() => {
              setPurchaseInvoiceToEdit(null);
              setActiveTab('purchase-list');
            }}
            onOpenNewSupplierModal={() => handleOpenAddParty('SUPPLIER')}
          />
        );

      case 'purchase-list':
        return (
          <PurchaseListView
            initialSubTab="active"
            onEditInvoice={(pur) => {
              setPurchaseInvoiceToEdit(pur);
              setActiveTab('purchase-entry');
            }}
            onOpenPaymentOutModal={handleOpenPaymentOut}
            onOpenReturnModal={() => setActiveTab('purchase-returns')}
          />
        );

      case 'deleted-purchases':
        return (
          <PurchaseListView
            initialSubTab="deleted"
            onEditInvoice={(pur) => {
              setPurchaseInvoiceToEdit(pur);
              setActiveTab('purchase-entry');
            }}
            onOpenPaymentOutModal={handleOpenPaymentOut}
            onOpenReturnModal={() => setActiveTab('purchase-returns')}
          />
        );

      case 'purchase-orders':
        return <PurchaseOrdersView />;

      case 'purchase-returns':
        return <PurchaseReturnView />;

      case 'installments':
        return <InstallmentView />;

      case 'products-list':
        return (
          <ProductsListView
            onOpenAddModal={handleOpenAddProduct}
            onOpenEditModal={handleOpenEditProduct}
          />
        );

      case 'medicine':
        return <MedicineView />;

      case 'batch-inventory':
        return <BatchInventoryView />;

      case 'categories':
        return <CategoriesView />;

      case 'warranties':
        return <WarrantyManagementView />;

      case 'utilities':
        return <UtilitiesView />;

      case 'expenses':
        return (
          <ExpensesView
            onOpenNewExpenseModal={() => setIsExpenseModalOpen(true)}
          />
        );

      case 'wallets':
      case 'cash-adjustment':
        return <WalletsView />;

      case 'hr-payroll':
        return <HrPayrollView />;

      case 'reports':
        return <ReportsView key={activeReportKind} initialReportType={activeReportKind} />;

      case 'users':
        return <UsersView />;

      case 'activity-logs':
        return <ActivityLogView />;

      case 'settings':
        return <SettingsView />;

      default:
        return (
          <DashboardView
            onOpenPaymentInModal={() => handleOpenPaymentIn()}
            onOpenPaymentOutModal={() => handleOpenPaymentOut()}
            onOpenCashAdjustModal={() => setIsCashAdjustModalOpen(true)}
            onOpenProductModal={handleOpenAddProduct}
            onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
            onOpenKeyboardShortcuts={() => setIsKeyboardShortcutsOpen(true)}
          />
        );
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8FAFC] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      {/* Sidebar navigation */}
      <div className="no-print print:hidden h-full shrink-0 flex">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenPaymentIn={handleOpenPaymentIn}
          onOpenPaymentOut={handleOpenPaymentOut}
          onOpenAddProduct={handleOpenAddProduct}
          onOpenAddParty={handleOpenAddParty}
          onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
          onOpenCashAdjustModal={() => setIsCashAdjustModalOpen(true)}
          onSelectReportType={handleSelectReport}
        />
      </div>

      {/* Main content wrapper - strictly hidden when printing */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden print:hidden">
        {/* Top Navbar */}
        <div className="no-print print:hidden">
          <Navbar
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onOpenPaymentInModal={() => handleOpenPaymentIn()}
            onOpenKeyboardShortcuts={() => setIsKeyboardShortcutsOpen(true)}
          />
        </div>

        {/* Dynamic View Container */}
        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-5 lg:px-6 pb-24 lg:pb-6 transition-all flex flex-col justify-between w-full">
          <div className="w-full">
            {renderActiveView()}
          </div>

          {/* Footer with Developer Attribution */}
          <footer className="no-print w-full mt-8 pt-4 pb-4 sm:pb-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{companySettings.name || 'DokanPro ERP'}</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium">
                <Code2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Developer By : <strong className="text-slate-800 dark:text-slate-200">Md. Tarikul Islam</strong>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Phone- <a href="tel:01312305225" className="font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:underline">01312305225</a></span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <MapPin className="w-3 h-3 text-rose-500" />
                <span>Sherpur, Sadar, Sherpur</span>
              </div>
            </div>
          </footer>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (Phone & Tablet) */}
      <div className="no-print print:hidden">
        <MobileBottomNav onOpenSidebar={() => setIsSidebarOpen(true)} />
      </div>

      {/* Global Modals */}
      <PrintInvoiceModal />

      <PaymentInModal
        isOpen={isPaymentInOpen}
        onClose={() => setIsPaymentInOpen(false)}
        initialPartyId={paymentInPartyId}
      />

      <PaymentOutModal
        isOpen={isPaymentOutOpen}
        onClose={() => setIsPaymentOutOpen(false)}
        initialSupplierId={paymentOutSupplierId}
      />

      <PartyModal
        isOpen={isPartyModalOpen}
        onClose={() => setIsPartyModalOpen(false)}
        partyToEdit={partyToEdit}
        defaultType={partyDefaultType}
      />

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={productToEdit}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
      />

      <CashAdjustmentModal
        isOpen={isCashAdjustModalOpen}
        onClose={() => setIsCashAdjustModalOpen(false)}
      />

      <KeyboardShortcutsModal
        isOpen={isKeyboardShortcutsOpen}
        onClose={() => setIsKeyboardShortcutsOpen(false)}
        onNavigate={(tab) => setActiveTab(tab)}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-2xl border border-slate-800 dark:border-slate-200 text-xs font-semibold">
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 dark:text-red-600" />}
          {toastMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 dark:text-amber-600" />}
          {toastMessage.type === 'info' && <Info className="w-4 h-4 text-blue-400 dark:text-blue-600" />}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isLoggedIn } = useApp();
  if (!isLoggedIn) {
    return <LoginScreen />;
  }
  return <MainLayout />;
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

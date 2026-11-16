export * from './dbHelpers';
export * from './masterData';
export * from './sales';
export * from './purchases';
export * from './inventory';
export * from './accounting';
export * from './approvals';
export * from './administration';

import {
  useAccountTypeMutations,
  useCategoryMutations,
  useCustomerMutations,
  useProductMutations,
  useVendorMutations,
  useWarehouseMutations,
} from './masterData';
import {
  useCommissionMutations,
  useCreditNoteMutations,
  useCustomerReceiptMutations,
  useQuotationMutations,
  useSalesInvoiceMutations,
  useSalesOrderMutations,
  useSalesReturnMutations,
} from './sales';
import {
  useDebitNoteMutations,
  usePurchaseInvoiceMutations,
  usePurchaseOrderMutations,
  usePurchaseRequestMutations,
  usePurchaseReturnMutations,
  useVendorBillMutations,
  useVendorPaymentMutations,
} from './purchases';
import {
  useBatchMutations,
  useSerialMutations,
  useStockAdjustmentMutations,
  useStockTransferMutations,
} from './inventory';
import {
  useBankAccountMutations,
  useChartOfAccountMutations,
  useExpenseIncomeMutations,
  useFinancialYearMutations,
  useJournalEntryMutations,
} from './accounting';
import { useApprovalMutations } from './approvals';
import {
  useBranchMutations,
  useDepartmentMutations,
  useOrganizationMutations,
  useSecurityMutations,
  useUserMutations,
} from './administration';

/**
 * Aggregates all `useMutation`-backed service actions for modules that perform
 * multiple cross-domain writes.
 */
export function useErpMutations() {
  const customerMut = useCustomerMutations();
  const vendorMut = useVendorMutations();
  const accountTypeMut = useAccountTypeMutations();
  const categoryMut = useCategoryMutations();
  const warehouseMut = useWarehouseMutations();
  const productMut = useProductMutations();

  const salesInvoiceMut = useSalesInvoiceMutations();
  const quotationMut = useQuotationMutations();
  const salesOrderMut = useSalesOrderMutations();
  const creditNoteMut = useCreditNoteMutations();
  const salesReturnMut = useSalesReturnMutations();
  const customerReceiptMut = useCustomerReceiptMutations();
  const commissionMut = useCommissionMutations();

  const purchaseRequestMut = usePurchaseRequestMutations();
  const purchaseOrderMut = usePurchaseOrderMutations();
  const purchaseInvoiceMut = usePurchaseInvoiceMutations();
  const vendorBillMut = useVendorBillMutations();
  const debitNoteMut = useDebitNoteMutations();
  const purchaseReturnMut = usePurchaseReturnMutations();
  const vendorPaymentMut = useVendorPaymentMutations();

  const stockTransferMut = useStockTransferMutations();
  const stockAdjustmentMut = useStockAdjustmentMutations();
  const batchMut = useBatchMutations();
  const serialMut = useSerialMutations();

  const bankAccountMut = useBankAccountMutations();
  const journalEntryMut = useJournalEntryMutations();
  const coaMut = useChartOfAccountMutations();
  const fyMut = useFinancialYearMutations();
  const expIncMut = useExpenseIncomeMutations();

  const approvalMut = useApprovalMutations();

  const orgMut = useOrganizationMutations();
  const branchMut = useBranchMutations();
  const deptMut = useDepartmentMutations();
  const userMut = useUserMutations();
  const securityMut = useSecurityMutations();

  return {
    ...customerMut,
    ...vendorMut,
    ...accountTypeMut,
    ...categoryMut,
    ...warehouseMut,
    ...productMut,
    ...salesInvoiceMut,
    ...quotationMut,
    ...salesOrderMut,
    ...creditNoteMut,
    ...salesReturnMut,
    ...customerReceiptMut,
    ...commissionMut,
    ...purchaseRequestMut,
    ...purchaseOrderMut,
    ...purchaseInvoiceMut,
    ...vendorBillMut,
    ...debitNoteMut,
    ...purchaseReturnMut,
    ...vendorPaymentMut,
    ...stockTransferMut,
    ...stockAdjustmentMut,
    ...batchMut,
    ...serialMut,
    ...bankAccountMut,
    ...journalEntryMut,
    ...coaMut,
    ...fyMut,
    ...expIncMut,
    ...approvalMut,
    ...orgMut,
    ...branchMut,
    ...deptMut,
    ...userMut,
    ...securityMut,
  };
}

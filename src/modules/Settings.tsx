import { useState, useRef } from 'react';
import { Building2, FileText, DollarSign, Shield, Save, Plus, Upload, X, Check } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';

interface DocSeq {
  document: string;
  prefix: string;
  nextNumber: number;
  padding: number;
}

const INITIAL_DOC_SEQS: DocSeq[] = [
  { document: 'Expense', prefix: 'ME-', nextNumber: 1, padding: 5 },
  { document: 'Grn', prefix: 'PI-', nextNumber: 3, padding: 5 },
  { document: 'Income', prefix: 'MI-', nextNumber: 2, padding: 5 },
  { document: 'Journal', prefix: 'JV-', nextNumber: 10, padding: 5 },
  { document: 'Payment', prefix: 'CP-', nextNumber: 4, padding: 5 },
  { document: 'Purchase Order', prefix: 'MPO-', nextNumber: 1, padding: 5 },
  { document: 'Purchase Request', prefix: 'MPR-', nextNumber: 1, padding: 5 },
  { document: 'Purchase Return', prefix: 'MDN-', nextNumber: 1, padding: 5 },
  { document: 'Quotation', prefix: 'MQ-', nextNumber: 1, padding: 5 },
  { document: 'Receipt', prefix: 'CR-', nextNumber: 7, padding: 5 },
  { document: 'Sales Invoice', prefix: 'MS-', nextNumber: 2, padding: 5 },
  { document: 'Sales Order', prefix: 'MSO-', nextNumber: 1, padding: 5 },
  { document: 'Sales Return', prefix: 'MCN-', nextNumber: 1, padding: 5 },
  { document: 'Stock Adjustment', prefix: 'MSA-', nextNumber: 1, padding: 5 },
  { document: 'Stock Transfer', prefix: 'MST-', nextNumber: 1, padding: 5 },
  { document: 'Vendor Bill', prefix: 'MP-', nextNumber: 1, padding: 5 },
];

export function Settings() {
  const toast = useToast();
  const { companyLogo, setCompanyLogo, orgSettings, updateOrgSettings } = useDataStore();

  const [activeTab, setActiveTab] = useState<
    'Organization Profile' | 'Document Numbering' | 'Currencies & Rates' | 'Security & Delivery'
  >('Organization Profile');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docSeqs, setDocSeqs] = useState<DocSeq[]>(INITIAL_DOC_SEQS);

  // Profile Form State
  const [orgName, setOrgName] = useState(orgSettings.name || 'AMKAS INTERNATIONAL');
  const [legalName, setLegalName] = useState(orgSettings.legal_name || 'AMKAS INTERNATIONAL ERP');
  const [regAddress, setRegAddress] = useState(orgSettings.address || '');
  const [phone, setPhone] = useState(orgSettings.phone || '');
  const [email, setEmail] = useState(orgSettings.email || 'admin123@gmail.com');
  const [website, setWebsite] = useState(orgSettings.tax_id || '');

  const [baseCurrency, setBaseCurrency] = useState(orgSettings.currency || 'PKR');
  const [decimalPlaces, setDecimalPlaces] = useState(String(orgSettings.decimal_places || '2'));
  const [taxLabel, setTaxLabel] = useState(orgSettings.tax_label || 'GST / NTN');
  const [taxRate, setTaxRate] = useState(String(orgSettings.default_tax_rate || '0.0000'));
  const [defaultPrefix, setDefaultPrefix] = useState(orgSettings.default_invoice_prefix || 'MS-');
  const [dateFormat, setDateFormat] = useState(orgSettings.date_format || '21 Jun 2026');

  // Exchange rate form
  const [targetCurrency, setTargetCurrency] = useState('AED - UAE Dirham');
  const [rateDate, setRateDate] = useState('2026-07-21');
  const [rateToPkr, setRateToPkr] = useState('');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error('File size exceeds 5MB');
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCompanyLogo(base64);
      toast.success('Company logo uploaded successfully');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    updateOrgSettings({
      name: orgName,
      legal_name: legalName,
      address: regAddress,
      phone,
      email,
      currency: baseCurrency,
      decimal_places: Number(decimalPlaces) || 2,
      tax_label: taxLabel,
      default_tax_rate: Number(taxRate) || 0,
      default_invoice_prefix: defaultPrefix,
      date_format: dateFormat,
    });
    toast.success('Organization profile updated and saved');
  };

  const handleUpdateSeq = (docName: string, patch: Partial<DocSeq>) => {
    setDocSeqs((prev) => prev.map((s) => (s.document === docName ? { ...s, ...patch } : s)));
  };

  const generatePreview = (seq: DocSeq) => {
    return `${seq.prefix}${String(seq.nextNumber).padStart(seq.padding, '0')}`;
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Organization Settings</h1>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto">
        {['Organization Profile', 'Document Numbering', 'Currencies & Rates', 'Security & Delivery'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition border-b-2 ${
              activeTab === tab
                ? 'border-amber-500 text-amber-500 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ORGANIZATION PROFILE */}
      {activeTab === 'Organization Profile' && (
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ORGANIZATION IDENTITY</p>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Branding used across dashboards, invoices, vouchers and every printable report.
              </h3>
            </div>

            {/* Logo Picker & Preview */}
            <div className="flex items-center gap-5">
              <div className="relative grid h-20 w-20 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 place-items-center shadow-md">
                {companyLogo ? (
                  <img src={companyLogo} alt="Company Logo" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-amber-500 text-2xl font-extrabold text-white">
                    A
                  </div>
                )}
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Upload className="h-4 w-4 text-amber-500" /> Choose logo
                  </button>
                  {companyLogo && (
                    <button
                      onClick={() => {
                        setCompanyLogo(null);
                        toast.success('Logo removed');
                      }}
                      className="rounded-lg border border-rose-500/40 px-2 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-slate-400">PNG, JPG or WEBP Max 5 MB.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Organization name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Legal name</label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Registered address</label>
                <textarea
                  rows={2}
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Website</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5 dark:border-slate-700 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FINANCE & TAX</p>
                <p className="text-xs text-slate-400">Core defaults used by accounting and document engines.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Base currency</label>
                  <select
                    value={baseCurrency}
                    onChange={(e) => setBaseCurrency(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="PKR">PKR - Pakistani Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="AED">AED - UAE Dirham</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Decimal places</label>
                  <select
                    value={decimalPlaces}
                    onChange={(e) => setDecimalPlaces(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="2">2</option>
                    <option value="4">4</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Tax label</label>
                  <input
                    type="text"
                    value={taxLabel}
                    onChange={(e) => setTaxLabel(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Default tax rate %</label>
                  <input
                    type="text"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5 dark:border-slate-700 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DOCUMENT DISPLAY</p>
                <p className="text-xs text-slate-400">Formatting used by reports and printable documents.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Default invoice prefix</label>
                  <input
                    type="text"
                    value={defaultPrefix}
                    onChange={(e) => setDefaultPrefix(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Date format</label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="21 Jun 2026">21 Jun 2026</option>
                    <option value="2026-06-21">2026-06-21</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={handleSaveProfile}
                className="btn-primary"
              >
                Save organization settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT NUMBERING */}
      {activeTab === 'Document Numbering' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DOCUMENT CONTROL</p>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Numbering sequences</h2>
            </div>
            <span className="text-xs text-slate-400">Independent counters per organization</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">DOCUMENT</th>
                  <th className="px-4 py-3">PREFIX</th>
                  <th className="px-4 py-3">NEXT NUMBER</th>
                  <th className="px-4 py-3">PADDING</th>
                  <th className="px-4 py-3">PREVIEW</th>
                  <th className="px-4 py-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {docSeqs.map((seq) => (
                  <tr key={seq.document} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{seq.document}</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={seq.prefix}
                        onChange={(e) => handleUpdateSeq(seq.document, { prefix: e.target.value })}
                        className="w-24 rounded border border-slate-300 bg-white p-1 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none font-mono"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={seq.nextNumber}
                        onChange={(e) => handleUpdateSeq(seq.document, { nextNumber: Number(e.target.value) })}
                        className="w-20 rounded border border-slate-300 bg-white p-1 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none font-mono"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={seq.padding}
                        onChange={(e) => handleUpdateSeq(seq.document, { padding: Number(e.target.value) })}
                        className="w-16 rounded border border-slate-300 bg-white p-1 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none font-mono"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-amber-500">
                      {generatePreview(seq)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toast.success(`Saved sequence for ${seq.document}`)}
                        className="rounded border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CURRENCIES & RATES */}
      {activeTab === 'Currencies & Rates' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 dark:border-slate-700">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">MULTI-CURRENCY</p>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Exchange-rate history</h3>
              </div>
              <span className="text-xs text-slate-400">Rate to PKR</span>
            </div>

            <div className="mt-6 p-8 text-center text-xs text-slate-400 border border-dashed border-slate-700 rounded-lg">
              No exchange rate history recorded yet.
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Add exchange rate</h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Currency</label>
                <select
                  value={targetCurrency}
                  onChange={(e) => setTargetCurrency(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="AED - UAE Dirham">AED - UAE Dirham</option>
                  <option value="EUR - Euro">EUR - Euro</option>
                  <option value="GBP - British Pound">GBP - British Pound</option>
                  <option value="SAR - Saudi Riyal">SAR - Saudi Riyal</option>
                  <option value="USD - US Dollar">USD - US Dollar</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Rate date</label>
                <input
                  type="date"
                  value={rateDate}
                  onChange={(e) => setRateDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Rate to PKR</label>
                <input
                  type="number"
                  placeholder="e.g. 280"
                  value={rateToPkr}
                  onChange={(e) => setRateToPkr(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div className="rounded-lg bg-amber-500/15 p-3 text-[11px] text-amber-400">
                Example: If 1 USD equals 280 PKR, enter 280 when PKR is the base currency.
              </div>

              <button
                onClick={() => toast.success('Exchange rate added')}
                className="w-full rounded-lg bg-amber-500 py-2 text-xs font-semibold text-white hover:bg-amber-600"
              >
                Save rate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY & DELIVERY */}
      {activeTab === 'Security & Delivery' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SECURITY CONTROLS</p>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Access protection</h3>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex justify-between border-b pb-2 dark:border-slate-800">
                <span>Dynamic roles</span>
                <span className="font-semibold text-slate-200">View • Create • Edit • Delete • Approve • Export</span>
              </div>
              <div className="flex justify-between border-b pb-2 dark:border-slate-800">
                <span>Scope restrictions</span>
                <span className="font-semibold text-slate-200">Organization • Branch • Department</span>
              </div>
              <div className="flex justify-between border-b pb-2 dark:border-slate-800">
                <span>Login tracking</span>
                <span className="font-semibold text-amber-400">Successful, failed and logout events</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CRON AUTOMATION</p>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Email & scheduled reports</h3>
            <div className="rounded-lg bg-slate-900/60 p-3 text-xs text-slate-300 space-y-2 font-mono">
              <p>1. Configure cron key in config.php</p>
              <p>2. Set hourly cron job for report queue delivery</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

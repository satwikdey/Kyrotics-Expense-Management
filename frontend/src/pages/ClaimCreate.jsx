import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { STANDARD_CATEGORIES } from '../utils/categories';
import { parseInrToPaise, formatInr } from '../utils/format';
import { submitClaim } from '../services/claimService';

export default function ClaimCreate({ companyName = 'Kyrotics' }) {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];

  const [categoryId, setCategoryId] = useState(1);
  const [claimDate, setClaimDate] = useState(today);
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [missingBillReason, setMissingBillReason] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedCategory = STANDARD_CATEGORIES.find((c) => c.id === Number(categoryId)) || STANDARD_CATEGORIES[0];

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (files.length + selected.length > 5) {
      alert('You can upload a maximum of 5 files per claim.');
      return;
    }

    const validFiles = [];
    for (const file of selected) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`"${file.name}" exceeds the 5MB file limit.`);
        continue;
      }
      validFiles.push(file);
    }
    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const paise = parseInrToPaise(amountStr);
    if (!paise || paise <= 0) {
      return setError('Please enter a valid expense amount in INR (greater than ₹0).');
    }

    if (files.length === 0 && !missingBillReason.trim()) {
      return setError('An explanation is required when no bill or receipt is attached.');
    }

    setSubmitting(true);
    try {
      const claimData = {
        claim_category_id: selectedCategory.id,
        category_name: selectedCategory.name,
        claim_date: claimDate,
        amount_paise: paise,
        description: description.trim(),
        missing_bill_explanation: files.length === 0 ? missingBillReason.trim() : null,
      };

      await submitClaim(claimData, files, userProfile);
      navigate('/claims', { state: { submitted: true } });
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      {/* 1st Page Action Banner linking to previous claim status */}
      <div className="status-nav-banner">
        <div>
          <div className="title">Need to review existing submissions?</div>
          <div className="subtitle">
            Track approval progress, download receipts, and view settlement status.
          </div>
        </div>
        <Link to="/claims" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
          Check Previous Claims Status →
        </Link>
      </div>

      <div className="card">
        <div className="card-header">
          <h1 className="card-title" style={{ fontSize: '18px' }}>
            Submit New Expense Claim
          </h1>
          <span className="badge badge-neutral">Locked on Submit</span>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="alert alert-warning" style={{ fontSize: '13px', lineHeight: 1.5 }}>
          ⚠️ <strong>Immutability Notice:</strong> Once submitted, claims are <strong>permanently locked</strong> and cannot be edited or modified. Please verify all amounts, category, and receipts before submission.
        </div>

        <form onSubmit={handleSubmit}>
          {/* Claim Category */}
          <div className="form-group">
            <label className="form-label" htmlFor="category">
              Claim Category <span style={{ color: 'var(--danger-btn)' }}>*</span>
            </label>
            <select
              id="category"
              className="form-control"
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              required
            >
              {STANDARD_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {selectedCategory && (
              <div className="category-example-box">
                💡 <strong>Typical expenses:</strong> {selectedCategory.examples}
              </div>
            )}
          </div>

          {/* Date & Amount */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="claim_date">
                Expense Date <span style={{ color: 'var(--danger-btn)' }}>*</span>
              </label>
              <input
                id="claim_date"
                type="date"
                className="form-control"
                value={claimDate}
                max={today}
                onChange={(e) => setClaimDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="amount">
                Amount (INR ₹) <span style={{ color: 'var(--danger-btn)' }}>*</span>
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                className="form-control"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                required
              />
              {amountStr && (
                <span className="form-hint" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  Stored value: {formatInr(parseInrToPaise(amountStr))}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="description">
              Business Purpose / Description <span style={{ color: 'var(--danger-btn)' }}>*</span>
            </label>
            <textarea
              id="description"
              className="form-control"
              rows={3}
              placeholder="Explain the business reason for this expense..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Bill Uploads */}
          <div className="form-group">
            <label className="form-label" htmlFor="bills">
              Upload Bills / Receipts (Optional, up to 5 files, 5MB each)
            </label>
            <input
              id="bills"
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              className="form-control"
              onChange={handleFileChange}
              disabled={files.length >= 5}
            />
            <span className="form-hint">
              Supported formats: PDF, PNG, JPG. Max 5MB per file.
            </span>

            {files.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-subtle)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span>
                      📎 {file.name} ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--danger-btn)',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Missing Bill Explanation (Mandatory if 0 files) */}
          {files.length === 0 && (
            <div className="form-group" style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '14px', borderRadius: '8px' }}>
              <label className="form-label" htmlFor="missing_reason" style={{ color: '#92400e' }}>
                Reason for Missing Bill / Receipt <span style={{ color: 'var(--danger-btn)' }}>*</span>
              </label>
              <input
                id="missing_reason"
                type="text"
                className="form-control"
                placeholder="e.g. Paper taxi slip not provided, vendor could not issue invoice..."
                value={missingBillReason}
                onChange={(e) => setMissingBillReason(e.target.value)}
                required
              />
              <span className="form-hint" style={{ color: '#b45309' }}>
                Required: Finance policy requires justification when submitting an expense without a receipt.
              </span>
            </div>
          )}

          <div style={{ marginTop: '24px' }}>
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={submitting}
              style={{ fontSize: '16px', padding: '13px' }}
            >
              {submitting ? 'Submitting Claim...' : '🔒 Submit Claim (Locked Upon Submission)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


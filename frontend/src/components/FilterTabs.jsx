import React from 'react';

export default function FilterTabs({ activeFilter = 'all', onSelect, counts = {} }) {
  const tabs = [
    { key: 'all', label: 'All Claims', count: counts.total },
    { key: 'pending', label: 'Pending Review', count: counts.pending },
    { key: 'approved', label: 'Approved (To Settle)', count: counts.approved },
    { key: 'settled', label: 'Settled', count: counts.settled },
    { key: 'rejected', label: 'Rejected', count: counts.rejected },
  ];

  return (
    <div className="filter-tabs" role="tablist" aria-label="Claim status filter">
      {tabs.map((tab) => {
        const isActive = activeFilter === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`filter-tab ${isActive ? 'active' : ''}`}
            onClick={() => onSelect(tab.key)}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: isActive ? 'rgba(255, 255, 255, 0.25)' : '#e2e8f0',
                  color: isActive ? '#ffffff' : '#475569',
                  fontWeight: 700,
                  marginLeft: '4px',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}


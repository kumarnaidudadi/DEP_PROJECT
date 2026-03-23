'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import {
    AlignJustify,
    AlignLeft,
    BadgeCheck,
    Building2,
    CalendarDays,
    CalendarRange,
    ChevronDown,
    Columns2,
    Hash,
    Heading1,
    IdCard,
    ListTodo,
    Search,
    ShieldCheck,
    Signature,
    ToggleLeft,
    UserRound,
} from 'lucide-react';
import {
    FIELD_TYPE_LABELS,
    FIELD_TYPE_OPTIONS,
    suggestFieldTypeFromName,
} from '@/types';

const categoryLabels = {
    basic: 'Basic Inputs',
    dates: 'Dates',
    profile: 'Profile (Auto-fill)',
    structural: 'Structural',
} as const;

const iconMap = {
    text: AlignLeft,
    textarea: AlignJustify,
    number: Hash,
    select: Columns2,
    bool: ToggleLeft,
    date: CalendarDays,
    date_from_to: CalendarRange,
    name: UserRound,
    designation: BadgeCheck,
    employee_code: IdCard,
    department: Building2,
    role: ShieldCheck,
    signature: Signature,
    heading: Heading1,
    paragraph_blanks: AlignJustify,
    tuple: Columns2,
    list: ListTodo,
    date_today: CalendarDays,
} satisfies Record<string, React.ComponentType<{ className?: string }>>;

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ');
}

interface FieldTypePickerProps {
    value: string;
    onChange: (type: string) => void;
    fieldName?: string;
    recentTypes?: string[];
    disabled?: boolean;
    /** If provided, shown as a subtle suggestion hint beneath the trigger */
    suggestion?: string | null;
    /** Callback when the suggestion is clicked */
    onSuggestionClick?: () => void;
}

export default function FieldTypePicker({
    value,
    onChange,
    fieldName = '',
    recentTypes = [],
    disabled = false,
    suggestion,
    onSuggestionClick,
}: FieldTypePickerProps) {
    const [open, setOpen] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [isClosing, setIsClosing] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const searchRef = React.useRef<HTMLInputElement | null>(null);
    const deferredQuery = React.useDeferredValue(query);

    const selectedMeta = React.useMemo(
        () => FIELD_TYPE_OPTIONS.find(option => option.type === value),
        [value]
    );

    const suggestedType = React.useMemo(
        () => suggestFieldTypeFromName(fieldName),
        [fieldName]
    );

    const normalizedQuery = deferredQuery.trim().toLowerCase();

    const filteredOptions = React.useMemo(() => {
        if (!normalizedQuery) return FIELD_TYPE_OPTIONS;

        return FIELD_TYPE_OPTIONS.filter(option => {
            const haystack = `${option.label} ${option.description} ${option.type}`.toLowerCase();
            return haystack.includes(normalizedQuery);
        });
    }, [normalizedQuery]);

    const filteredRecent = React.useMemo(() => {
        return recentTypes
            .map(type => FIELD_TYPE_OPTIONS.find(option => option.type === type))
            .filter((option): option is NonNullable<typeof option> => Boolean(option))
            .filter(option => filteredOptions.some(match => match.type === option.type));
    }, [filteredOptions, recentTypes]);

    const groupedOptions = React.useMemo(() => {
        return filteredOptions.reduce<Record<string, typeof FIELD_TYPE_OPTIONS>>((groups, option) => {
            const bucket = groups[option.category] || [];
            bucket.push(option);
            groups[option.category] = bucket;
            return groups;
        }, {});
    }, [filteredOptions]);

    const beginClose = React.useCallback(() => {
        setIsClosing(true);
        window.setTimeout(() => {
            setOpen(false);
            setMounted(false);
            setIsClosing(false);
            setQuery('');
        }, 150);
    }, []);

    const handleSelect = React.useCallback((type: string) => {
        onChange(type);
        beginClose();
    }, [beginClose, onChange]);

    React.useEffect(() => {
        if (!open) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') beginClose();
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);

        const timer = window.setTimeout(() => searchRef.current?.focus(), 40);

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKeyDown);
            window.clearTimeout(timer);
        };
    }, [beginClose, open]);

    const modal = mounted ? (
        <div
            className={cx(
                'fixed inset-0 z-50 flex items-start justify-center bg-slate-950/20 px-4 pt-[8vh] backdrop-blur-[2px]',
                isClosing ? 'animate-fade-out' : 'animate-fade-in'
            )}
            onMouseDown={beginClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Select field type"
                className={cx(
                    'w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-28px_rgba(15,23,42,0.25)]',
                    isClosing ? 'animate-picker-out' : 'animate-picker-in'
                )}
                onMouseDown={event => event.stopPropagation()}
            >
                {/* Compact header */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937' }}>Select Field Type</div>
                    </div>
                    <div style={{ position: 'relative', width: '220px' }}>
                        <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9ca3af', pointerEvents: 'none' }} />
                        <input
                            ref={searchRef}
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            placeholder="Search..."
                            style={{ width: '100%', height: '32px', paddingLeft: '30px', paddingRight: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', outline: 'none', color: '#1f2937' }}
                        />
                    </div>
                </div>

                {/* Compact body */}
                <div style={{ maxHeight: '50vh', overflowY: 'auto', padding: '12px 16px' }}>
                    {suggestedType && suggestedType !== value && (
                        <button type="button" onClick={() => handleSelect(suggestedType)}
                            style={{ marginBottom: '10px', fontSize: '11px', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                            Suggested: <strong>{FIELD_TYPE_LABELS[suggestedType] || suggestedType}</strong>
                        </button>
                    )}

                    {filteredRecent.length > 0 && (
                        <section style={{ marginBottom: '12px' }}>
                            <h3 style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Recently Used</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                {filteredRecent.map(option => (
                                    <OptionCard key={`recent-${option.type}`} option={option} selected={option.type === value} onSelect={handleSelect} />
                                ))}
                            </div>
                        </section>
                    )}

                    {(Object.keys(categoryLabels) as Array<keyof typeof categoryLabels>).map(category => {
                        const options = groupedOptions[category];
                        if (!options?.length) return null;
                        return (
                            <section key={category} style={{ marginBottom: '12px' }}>
                                <h3 style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{categoryLabels[category]}</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                    {options.map(option => (
                                        <OptionCard key={option.type} option={option} selected={option.type === value} onSelect={handleSelect} />
                                    ))}
                                </div>
                            </section>
                        );
                    })}

                    {filteredOptions.length === 0 && (
                        <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: '#9ca3af', border: '2px dashed #e5e7eb', borderRadius: '8px' }}>
                            No field types matched that search.
                        </div>
                    )}
                </div>
            </div>
        </div>
    ) : null;

    const displayLabel = selectedMeta?.label || FIELD_TYPE_LABELS[value] || value;

    return (
        <div>
            <button
                type="button"
                disabled={disabled}
                onClick={() => { setMounted(true); setOpen(true); }}
                style={{
                    width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px',
                    fontSize: '12px', color: '#1f2937', background: '#ffffff', cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
                    outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box' as const,
                    opacity: disabled ? 0.6 : 1,
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayLabel}</span>
                <ChevronDown size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
            </button>
            {suggestion && suggestion !== value && onSuggestionClick && (
                <button type="button" onClick={onSuggestionClick}
                    style={{ marginTop: '3px', fontSize: '10px', color: '#92400e', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '3px', opacity: 0.8 }}>
                    ✦ Use {FIELD_TYPE_LABELS[suggestion] || suggestion}?
                </button>
            )}
            {open && typeof document !== 'undefined' ? createPortal(modal, document.body) : null}
        </div>
    );
}

function OptionCard({
    option,
    selected,
    onSelect,
}: {
    option: (typeof FIELD_TYPE_OPTIONS)[number];
    selected: boolean;
    onSelect: (type: string) => void;
}) {
    const Icon = iconMap[option.type as keyof typeof iconMap] || AlignLeft;

    return (
        <button
            type="button"
            onClick={() => onSelect(option.type)}
            style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                border: `1px solid ${selected ? '#93c5fd' : '#e5e7eb'}`, borderRadius: '8px',
                background: selected ? '#eff6ff' : '#fff', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s', width: '100%',
            }}
            title={option.description}
        >
            <span style={{
                width: '26px', height: '26px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: selected ? '#dbeafe' : '#f3f4f6', color: selected ? '#2563eb' : '#6b7280',
            }}>
                <Icon style={{ width: '13px', height: '13px' }} />
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.label}</span>
        </button>
    );
}

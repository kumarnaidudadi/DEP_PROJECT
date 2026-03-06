import React from 'react';

export const Button = ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
    return (
        <button
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => {
    return (
        <input
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${className}`}
            {...props}
        />
    );
};

export const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return (
        <div className={`bg-white rounded-lg shadow-md border border-gray-100 ${className}`}>
            {children}
        </div>
    );
};

export const CardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return <div className={`p-6 pb-2 ${className}`}>{children}</div>;
};

export const CardTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return <h3 className={`font-semibold leading-none tracking-tight ${className}`}>{children}</h3>;
};

export const CardDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return <p className={`text-sm text-gray-500 mt-2 ${className}`}>{children}</p>;
};

export const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
};

export const Label = ({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => {
    return (
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${className}`} {...props}>
            {children}
        </label>
    );
};

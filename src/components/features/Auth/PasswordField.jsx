import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const inputClassName =
    'w-full px-4 py-2 pr-11 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all';

export function PasswordField({
    value,
    onChange,
    placeholder = '••••••••',
    id = 'password',
    required = true,
    autoComplete = 'current-password',
}) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="relative">
            <input
                id={id}
                type={showPassword ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={inputClassName}
                required={required}
                autoComplete={autoComplete}
            />
            <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
            >
                {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
            </button>
        </div>
    );
}

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function PasswordField({
    value,
    onChange,
    placeholder = '••••••••',
    id = 'password',
    required = true,
    autoComplete = 'current-password',
    shellClassName = 'auth-input-shell',
    inputClassName = 'auth-input',
    actionClassName = 'auth-input-action',
}) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className={shellClassName}>
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
                className={actionClassName}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
            >
                {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
            </button>
        </div>
    );
}

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

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
        <div className="auth-input-shell neu-inset auth-input-shell--pill">
            <input
                id={id}
                type={showPassword ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="auth-input"
                required={required}
                autoComplete={autoComplete}
            />
            <button
                type="button"
                className="auth-input-action"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
            >
                {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
            </button>
        </div>
    );
}

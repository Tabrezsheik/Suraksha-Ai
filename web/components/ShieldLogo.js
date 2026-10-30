'use client';

export default function ShieldLogo({ className = "w-10 h-10" }) {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      <svg
        viewBox="0 0 220 220"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible drop-shadow-xs"
      >
        <defs>
          <clipPath id="navbar-shield-clip">
            <path d="M110 11 L185 36 L185 100 C185 146 153 182 110 200 C67 182 35 146 35 100 L35 36 Z" />
          </clipPath>
        </defs>

        {/* Shield outline */}
        <path
          d="M110 8 L190 34 L190 100 C190 150 155 190 110 210 C65 190 30 150 30 100 L30 34 Z"
          fill="none"
          stroke="#062442"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Shield fill halves */}
        <path d="M110 11 L35 36 L35 100 C35 146 67 182 110 200 Z" fill="#0072fc" />
        <path d="M110 11 L185 36 L185 100 C185 146 153 182 110 200 Z" fill="#00215c" />

        {/* Darker mid-blue fold facet */}
        <path d="M110 11 L89 25 L89 100 C89 144 98 170 105 188 L110 200 Z" fill="#0154bf" />

        {/* Waveform: Inner bars clipped to shield */}
        <g clipPath="url(#navbar-shield-clip)">
          <rect x="36.90" y="87.00" width="4.6" height="40.00" rx="2.30" fill="#062442" />
          <rect x="52.63" y="81.00" width="4.6" height="52.00" rx="2.30" fill="#062442" />
          <rect x="68.37" y="89.00" width="4.6" height="36.00" rx="2.30" fill="#062442" />
          <rect x="84.10" y="79.00" width="4.6" height="56.00" rx="2.30" fill="#062442" />
          <rect x="99.83" y="68.00" width="4.6" height="78.00" rx="2.30" fill="#ffffff" />
          <rect x="115.57" y="68.00" width="4.6" height="78.00" rx="2.30" fill="#ffffff" />
          <rect x="131.30" y="79.00" width="4.6" height="56.00" rx="2.30" fill="#7fb8e8" />
          <rect x="147.03" y="89.00" width="4.6" height="36.00" rx="2.30" fill="#7fb8e8" />
          <rect x="162.77" y="81.00" width="4.6" height="52.00" rx="2.30" fill="#7fb8e8" />
          <rect x="178.50" y="87.00" width="4.6" height="40.00" rx="2.30" fill="#7fb8e8" />
        </g>

        {/* Waveform: Outer bars extending freely */}
        <g>
          <rect x="-10.30" y="104.70" width="4.6" height="4.60" rx="2.30" fill="#062442" />
          <rect x="5.43" y="103.00" width="4.6" height="8.00" rx="2.30" fill="#062442" />
          <rect x="21.17" y="96.00" width="4.6" height="22.00" rx="2.30" fill="#062442" />
          <rect x="194.23" y="96.00" width="4.6" height="22.00" rx="2.30" fill="#7fb8e8" />
          <rect x="209.97" y="103.00" width="4.6" height="8.00" rx="2.30" fill="#7fb8e8" />
          <rect x="225.70" y="104.70" width="4.6" height="4.60" rx="2.30" fill="#7fb8e8" />
        </g>
      </svg>
    </div>
  );
}

export default function Logo({ className = "h-9 w-auto" }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="200" height="200" fill="#0A0A0A" rx="32" />
      <text
        x="100"
        y="95"
        fontFamily="'Georgia', 'Times New Roman', serif"
        fontSize="92"
        fontWeight="bold"
        fill="#C5A46D"
        textAnchor="middle"
        dominantBaseline="central"
      >
        S.
      </text>
      <text
        x="104"
        y="152"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        fontSize="20"
        fontWeight="700"
        letterSpacing="9"
        fill="#A1A1AA"
        textAnchor="middle"
      >
        TIMES
      </text>
    </svg>
  );
}
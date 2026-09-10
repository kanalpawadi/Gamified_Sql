// Lightweight SQL syntax highlighter for schema / seed display.
// (Extracted from App.tsx unchanged so it can be shared with the Labs UI.)

export function SchemaBlock({ sql }: { sql: string }) {
  const keywords = /\b(CREATE|TABLE|PRIMARY|KEY|NOT|NULL|DEFAULT|UNIQUE|INSERT|INTO|VALUES|INTEGER|REAL|TEXT|INTEGER|REFERENCES|ON|DELETE|CASCADE|WITH|AS|SELECT|FROM|WHERE|JOIN|LEFT|INNER|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END|AND|OR|IN|LIKE|BETWEEN|IS|UNION|ALL|RANK|OVER|PARTITION|ROW_NUMBER|DENSE_RANK|LAG|LEAD|EXISTS)\b/g;

  const highlighted = sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'([^']*?)'/g, '<span class="str">\'$1\'</span>')
    .replace(keywords, '<span class="kw">$1</span>')
    .replace(/\b(INTEGER|REAL|TEXT|NUMERIC|BOOLEAN)\b/g, '<span class="type">$1</span>');

  return (
    <div
      className="schema-block"
      aria-label="SQL schema code"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

//src/app/test-aws/page.js:
"use client";
import { useState } from "react";

export default function TestAWS() {
  const [result, setResult] = useState(null);

  const handleTest = async () => {
    try {
      const res = await fetch("/api/test-aws");
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    }
  };

  return (
    <div>
      <h1>AWS S3 Test</h1>
      <button onClick={handleTest}>Test AWS Connection</button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

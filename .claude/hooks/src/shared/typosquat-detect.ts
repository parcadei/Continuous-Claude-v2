/**
 * Typosquat Detection Module
 *
 * Detects typosquatting attempts against popular packages in PyPI and npm.
 * Uses two strategies:
 *   1. Known typosquat variants (curated list)
 *   2. Levenshtein distance check against popular package names
 *
 * Returns { isTyposquat, similarTo, reason } for a given package name.
 */

export interface TyposquatResult {
  isTyposquat: boolean;
  similarTo?: string;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Popular packages by ecosystem
// ---------------------------------------------------------------------------

const POPULAR_PYPI: string[] = [
  'requests', 'flask', 'django', 'numpy', 'pandas', 'boto3', 'urllib3',
  'setuptools', 'cryptography', 'pillow', 'scikit-learn', 'tensorflow',
  'torch', 'pytorch', 'beautifulsoup4', 'sqlalchemy', 'celery', 'redis',
  'psycopg2', 'fastapi', 'pydantic', 'httpx', 'aiohttp', 'paramiko',
  'colorama', 'litellm', 'pip', 'wheel', 'six', 'pyyaml',
];

const POPULAR_NPM: string[] = [
  'express', 'react', 'lodash', 'axios', 'chalk', 'commander', 'webpack',
  'typescript', 'eslint', 'prettier', 'next', 'vue', 'angular', 'moment',
  'underscore', 'debug', 'uuid', 'dotenv', 'cors', 'jsonwebtoken',
  'bcrypt', 'mongoose', 'socket.io', 'tailwindcss', 'vite', 'esbuild',
  'zod', 'prisma', 'drizzle-orm', 'turbo',
];

// ---------------------------------------------------------------------------
// Known typosquat variants (curated)
// Key = typosquat name, Value = legitimate package it mimics
// ---------------------------------------------------------------------------

const KNOWN_PYPI_TYPOSQUATS: Record<string, string> = {
  // requests variants
  'requets': 'requests',
  'reqeusts': 'requests',
  'reequests': 'requests',
  'request': 'requests',
  'requsts': 'requests',
  'reqests': 'requests',

  // flask
  'flaask': 'flask',
  'flasks': 'flask',
  'flaskk': 'flask',

  // django
  'djnago': 'django',
  'djagno': 'django',
  'dajngo': 'django',

  // numpy
  'numppy': 'numpy',
  'numby': 'numpy',
  'nympy': 'numpy',

  // pandas
  'pandaas': 'pandas',
  'pandsa': 'pandas',

  // boto3
  'bto3': 'boto3',
  'boto33': 'boto3',

  // urllib3
  'urlib3': 'urllib3',
  'urrlib3': 'urllib3',

  // cryptography
  'cryptograpy': 'cryptography',
  'criptography': 'cryptography',

  // pillow
  'pilow': 'pillow',
  'pilllow': 'pillow',

  // colorama
  'colourama': 'colorama',
  'collorama': 'colorama',
  'coloramma': 'colorama',

  // litellm
  'litelm': 'litellm',
  'litellmm': 'litellm',
  'lite-llm': 'litellm',
  'litellm-proxy': 'litellm',

  // fastapi
  'fastapl': 'fastapi',
  'fast-api': 'fastapi',

  // pydantic
  'pydantiic': 'pydantic',
  'pydantik': 'pydantic',

  // setuptools
  'setuptool': 'setuptools',
  'setuptoolss': 'setuptools',

  // tensorflow
  'tenserflow': 'tensorflow',
  'tensorfow': 'tensorflow',

  // torch/pytorch
  'pytorchh': 'pytorch',
  'py-torch': 'pytorch',

  // sqlalchemy
  'sqlaclhemy': 'sqlalchemy',
  'sqlalcemy': 'sqlalchemy',

  // httpx
  'htppx': 'httpx',
  'httppx': 'httpx',

  // paramiko
  'parmaiko': 'paramiko',
  'paramko': 'paramiko',
};

const KNOWN_NPM_TYPOSQUATS: Record<string, string> = {
  // express
  'exprss': 'express',
  'expres': 'express',
  'expresss': 'express',
  'exppress': 'express',

  // react
  'reakt': 'react',
  'reactt': 'react',
  'raect': 'react',

  // lodash
  'lodasj': 'lodash',
  'loddash': 'lodash',
  'lodahs': 'lodash',
  'loadash': 'lodash',

  // axios
  'axois': 'axios',
  'axiso': 'axios',
  'axioss': 'axios',

  // chalk
  'challk': 'chalk',
  'chalks': 'chalk',

  // commander
  'comander': 'commander',
  'commanderr': 'commander',

  // webpack
  'webpck': 'webpack',
  'wepback': 'webpack',

  // typescript
  'typscript': 'typescript',
  'tyepscript': 'typescript',
  'typescrpt': 'typescript',

  // eslint
  'esllint': 'eslint',
  'elsint': 'eslint',

  // next
  'nextt': 'next',
  'nex': 'next',

  // vue
  'veu': 'vue',
  'vuee': 'vue',

  // moment
  'momnet': 'moment',
  'momet': 'moment',

  // dotenv
  'dotnev': 'dotenv',
  'dot-env': 'dotenv',

  // jsonwebtoken
  'jsonwebtokn': 'jsonwebtoken',
  'json-web-token': 'jsonwebtoken',

  // tailwindcss
  'tailwindcs': 'tailwindcss',
  'tailwincss': 'tailwindcss',

  // vite
  'vitte': 'vite',
  'viite': 'vite',

  // esbuild
  'esbuld': 'esbuild',
  'esbulid': 'esbuild',

  // zod
  'zodd': 'zod',
  'zodt': 'zod',
};

// ---------------------------------------------------------------------------
// Levenshtein distance
// ---------------------------------------------------------------------------

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Optimization: if length difference > 2, skip (we only care about distance <= 2)
  if (Math.abs(m - n) > 2) return 999;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // deletion
        dp[i][j - 1] + 1,       // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

// ---------------------------------------------------------------------------
// Main check function
// ---------------------------------------------------------------------------

export function checkTyposquat(
  packageName: string,
  ecosystem: 'pypi' | 'npm'
): TyposquatResult {
  const name = packageName.toLowerCase();

  // 1. Check if it IS a known popular package (exact match = safe)
  const popularList = ecosystem === 'pypi' ? POPULAR_PYPI : POPULAR_NPM;
  if (popularList.includes(name)) {
    return { isTyposquat: false };
  }

  // 2. Check against known typosquat list
  const knownList = ecosystem === 'pypi' ? KNOWN_PYPI_TYPOSQUATS : KNOWN_NPM_TYPOSQUATS;
  if (knownList[name]) {
    return {
      isTyposquat: true,
      similarTo: knownList[name],
      reason: `Known typosquat variant of "${knownList[name]}"`,
    };
  }

  // 3. Levenshtein distance check against all popular packages
  for (const popular of popularList) {
    const dist = levenshteinDistance(name, popular);
    if (dist > 0 && dist <= 2) {
      return {
        isTyposquat: true,
        similarTo: popular,
        reason: `Name is ${dist} edit(s) away from popular package "${popular}"`,
      };
    }
  }

  // 4. Not suspicious
  return { isTyposquat: false };
}

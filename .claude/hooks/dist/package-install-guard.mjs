#!/usr/bin/env node

// src/package-install-guard.ts
import { readFileSync } from "fs";
import https from "https";

// src/shared/output.ts
function outputContinue() {
  console.log(JSON.stringify({ result: "continue" }));
}

// src/shared/typosquat-detect.ts
var POPULAR_PYPI = [
  "requests",
  "flask",
  "django",
  "numpy",
  "pandas",
  "boto3",
  "urllib3",
  "setuptools",
  "cryptography",
  "pillow",
  "scikit-learn",
  "tensorflow",
  "torch",
  "pytorch",
  "beautifulsoup4",
  "sqlalchemy",
  "celery",
  "redis",
  "psycopg2",
  "fastapi",
  "pydantic",
  "httpx",
  "aiohttp",
  "paramiko",
  "colorama",
  "litellm",
  "pip",
  "wheel",
  "six",
  "pyyaml"
];
var POPULAR_NPM = [
  "express",
  "react",
  "lodash",
  "axios",
  "chalk",
  "commander",
  "webpack",
  "typescript",
  "eslint",
  "prettier",
  "next",
  "vue",
  "angular",
  "moment",
  "underscore",
  "debug",
  "uuid",
  "dotenv",
  "cors",
  "jsonwebtoken",
  "bcrypt",
  "mongoose",
  "socket.io",
  "tailwindcss",
  "vite",
  "esbuild",
  "zod",
  "prisma",
  "drizzle-orm",
  "turbo"
];
var KNOWN_PYPI_TYPOSQUATS = {
  // requests variants
  "requets": "requests",
  "reqeusts": "requests",
  "reequests": "requests",
  "request": "requests",
  "requsts": "requests",
  "reqests": "requests",
  // flask
  "flaask": "flask",
  "flasks": "flask",
  "flaskk": "flask",
  // django
  "djnago": "django",
  "djagno": "django",
  "dajngo": "django",
  // numpy
  "numppy": "numpy",
  "numby": "numpy",
  "nympy": "numpy",
  // pandas
  "pandaas": "pandas",
  "pandsa": "pandas",
  // boto3
  "bto3": "boto3",
  "boto33": "boto3",
  // urllib3
  "urlib3": "urllib3",
  "urrlib3": "urllib3",
  // cryptography
  "cryptograpy": "cryptography",
  "criptography": "cryptography",
  // pillow
  "pilow": "pillow",
  "pilllow": "pillow",
  // colorama
  "colourama": "colorama",
  "collorama": "colorama",
  "coloramma": "colorama",
  // litellm
  "litelm": "litellm",
  "litellmm": "litellm",
  "lite-llm": "litellm",
  "litellm-proxy": "litellm",
  // fastapi
  "fastapl": "fastapi",
  "fast-api": "fastapi",
  // pydantic
  "pydantiic": "pydantic",
  "pydantik": "pydantic",
  // setuptools
  "setuptool": "setuptools",
  "setuptoolss": "setuptools",
  // tensorflow
  "tenserflow": "tensorflow",
  "tensorfow": "tensorflow",
  // torch/pytorch
  "pytorchh": "pytorch",
  "py-torch": "pytorch",
  // sqlalchemy
  "sqlaclhemy": "sqlalchemy",
  "sqlalcemy": "sqlalchemy",
  // httpx
  "htppx": "httpx",
  "httppx": "httpx",
  // paramiko
  "parmaiko": "paramiko",
  "paramko": "paramiko"
};
var KNOWN_NPM_TYPOSQUATS = {
  // express
  "exprss": "express",
  "expres": "express",
  "expresss": "express",
  "exppress": "express",
  // react
  "reakt": "react",
  "reactt": "react",
  "raect": "react",
  // lodash
  "lodasj": "lodash",
  "loddash": "lodash",
  "lodahs": "lodash",
  "loadash": "lodash",
  // axios
  "axois": "axios",
  "axiso": "axios",
  "axioss": "axios",
  // chalk
  "challk": "chalk",
  "chalks": "chalk",
  // commander
  "comander": "commander",
  "commanderr": "commander",
  // webpack
  "webpck": "webpack",
  "wepback": "webpack",
  // typescript
  "typscript": "typescript",
  "tyepscript": "typescript",
  "typescrpt": "typescript",
  // eslint
  "esllint": "eslint",
  "elsint": "eslint",
  // next
  "nextt": "next",
  "nex": "next",
  // vue
  "veu": "vue",
  "vuee": "vue",
  // moment
  "momnet": "moment",
  "momet": "moment",
  // dotenv
  "dotnev": "dotenv",
  "dot-env": "dotenv",
  // jsonwebtoken
  "jsonwebtokn": "jsonwebtoken",
  "json-web-token": "jsonwebtoken",
  // tailwindcss
  "tailwindcs": "tailwindcss",
  "tailwincss": "tailwindcss",
  // vite
  "vitte": "vite",
  "viite": "vite",
  // esbuild
  "esbuld": "esbuild",
  "esbulid": "esbuild",
  // zod
  "zodd": "zod",
  "zodt": "zod"
};
function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 999;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        // deletion
        dp[i][j - 1] + 1,
        // insertion
        dp[i - 1][j - 1] + cost
        // substitution
      );
    }
  }
  return dp[m][n];
}
function checkTyposquat(packageName, ecosystem) {
  const name = packageName.toLowerCase();
  const popularList = ecosystem === "pypi" ? POPULAR_PYPI : POPULAR_NPM;
  if (popularList.includes(name)) {
    return { isTyposquat: false };
  }
  const knownList = ecosystem === "pypi" ? KNOWN_PYPI_TYPOSQUATS : KNOWN_NPM_TYPOSQUATS;
  if (knownList[name]) {
    return {
      isTyposquat: true,
      similarTo: knownList[name],
      reason: `Known typosquat variant of "${knownList[name]}"`
    };
  }
  for (const popular of popularList) {
    const dist = levenshteinDistance(name, popular);
    if (dist > 0 && dist <= 2) {
      return {
        isTyposquat: true,
        similarTo: popular,
        reason: `Name is ${dist} edit(s) away from popular package "${popular}"`
      };
    }
  }
  return { isTyposquat: false };
}

// src/shared/malicious-packages.json
var malicious_packages_default = {
  pypi: {
    litellm: {
      blocked_versions: ["1.82.7", "1.82.8"],
      reason: "TeamPCP supply chain attack via compromised Trivy CI/CD - credential stealer targeting SSH keys, cloud creds, K8s configs",
      date: "2026-03-24",
      advisory: "https://futuresearch.ai/blog/litellm-pypi-supply-chain-attack/"
    },
    colourama: {
      blocked_all: true,
      reason: "Typosquat of colorama - known malware",
      date: "2023-01-01"
    },
    "python-dateutil": {
      blocked_all: false,
      note: "Legitimate package - but watch for python_dateutil typosquats"
    },
    jeIlyfish: {
      blocked_all: true,
      reason: "Typosquat of jellyfish (uses uppercase I instead of lowercase l) - credential stealer",
      date: "2019-12-01"
    },
    "python3-dateutil": {
      blocked_all: true,
      reason: "Typosquat of python-dateutil - known malware",
      date: "2019-06-01"
    }
  },
  npm: {
    "event-stream": {
      blocked_versions: ["3.3.6"],
      reason: "Flatmap-stream crypto wallet stealer",
      date: "2018-11-26"
    },
    "ua-parser-js": {
      blocked_versions: ["0.7.29", "0.8.0", "1.0.0"],
      reason: "Supply chain attack - crypto miner and password stealer",
      date: "2021-10-22"
    },
    colors: {
      blocked_versions: ["1.4.1", "1.4.2"],
      reason: "Developer protest - infinite loop DoS (Marak incident)",
      date: "2022-01-09"
    },
    faker: {
      blocked_versions: ["6.6.6"],
      reason: "Developer protest - malicious payload (Marak incident)",
      date: "2022-01-05"
    },
    "node-ipc": {
      blocked_versions: ["10.1.1", "10.1.2", "10.1.3"],
      reason: "Peacenotwar malware - file deletion targeting Russian/Belarusian IPs",
      date: "2022-03-15"
    },
    coa: {
      blocked_versions: ["2.0.3", "2.0.4", "2.1.1", "2.1.3", "3.0.1", "3.1.3"],
      reason: "Compromised maintainer account - credential stealer",
      date: "2021-11-04"
    },
    rc: {
      blocked_versions: ["1.2.9", "1.3.9", "2.3.9"],
      reason: "Compromised maintainer account - credential stealer",
      date: "2021-11-04"
    }
  }
};

// src/package-install-guard.ts
var INSTALL_PATTERNS = [
  // Python
  { regex: /^pip\s+install\b/, ecosystem: "pypi", skipTokens: 2 },
  { regex: /^uv\s+pip\s+install\b/, ecosystem: "pypi", skipTokens: 3 },
  { regex: /^uv\s+add\b/, ecosystem: "pypi", skipTokens: 2 },
  { regex: /^poetry\s+add\b/, ecosystem: "pypi", skipTokens: 2 },
  // JavaScript / Node
  { regex: /^npm\s+install\b/, ecosystem: "npm", skipTokens: 2 },
  { regex: /^npm\s+i\b/, ecosystem: "npm", skipTokens: 2 },
  { regex: /^yarn\s+add\b/, ecosystem: "npm", skipTokens: 2 },
  { regex: /^pnpm\s+(add|install)\b/, ecosystem: "npm", skipTokens: 2 },
  { regex: /^bun\s+(add|install)\b/, ecosystem: "npm", skipTokens: 2 },
  // Rust
  { regex: /^cargo\s+(add|install)\b/, ecosystem: "cargo", skipTokens: 2 },
  // Go
  { regex: /^go\s+get\b/, ecosystem: "go", skipTokens: 2 },
  // Ruby
  { regex: /^gem\s+install\b/, ecosystem: "gem", skipTokens: 2 },
  // PHP
  { regex: /^composer\s+require\b/, ecosystem: "composer", skipTokens: 2 }
];
var FLAGS_WITH_VALUE = /* @__PURE__ */ new Set([
  "-r",
  "--requirement",
  "-c",
  "--constraint",
  "-e",
  "--editable",
  "-t",
  "--target",
  "-f",
  "--find-links",
  "-i",
  "--index-url",
  "--extra-index-url",
  "--prefix",
  "--root",
  "--src",
  // npm/yarn
  "--registry"
]);
var STANDALONE_FLAGS = /^-/;
function isPackageInstallCommand(command) {
  const trimmed = stripEnvPrefix(command).trim();
  for (const { regex } of INSTALL_PATTERNS) {
    if (regex.test(trimmed)) {
      const pkgs = extractPackageNames(command);
      return pkgs.length > 0;
    }
  }
  return false;
}
function parseEcosystem(command) {
  const trimmed = stripEnvPrefix(command).trim();
  for (const { regex, ecosystem } of INSTALL_PATTERNS) {
    if (regex.test(trimmed)) {
      return ecosystem;
    }
  }
  return null;
}
function extractPackageNames(command) {
  const trimmed = stripEnvPrefix(command).trim();
  const ecosystem = parseEcosystem(command);
  if (!ecosystem) return [];
  let skipTokens = 2;
  for (const pattern of INSTALL_PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      skipTokens = pattern.skipTokens;
      break;
    }
  }
  const tokens = tokenize(trimmed);
  const packages = [];
  let i = skipTokens;
  let skipNext = false;
  while (i < tokens.length) {
    const token = tokens[i];
    if (skipNext) {
      skipNext = false;
      i++;
      continue;
    }
    if (FLAGS_WITH_VALUE.has(token)) {
      skipNext = true;
      i++;
      continue;
    }
    if (STANDALONE_FLAGS.test(token)) {
      i++;
      continue;
    }
    const parsed = parsePackageToken(token, ecosystem);
    if (parsed) {
      packages.push(parsed);
    }
    i++;
  }
  return packages;
}
function checkOverride(command) {
  return /\bSKIP_PACKAGE_GUARD=1\b/.test(command);
}
function checkMaliciousPackage(name, version, ecosystem) {
  const ecosystemKey = ecosystem === "pypi" ? "pypi" : "npm";
  if (ecosystemKey !== "pypi" && ecosystemKey !== "npm") {
    return { blocked: false };
  }
  const registry = malicious_packages_default[ecosystemKey];
  if (!registry) return { blocked: false };
  const entry = registry[name.toLowerCase()];
  if (!entry) return { blocked: false };
  if (entry.blocked_all === true) {
    return {
      blocked: true,
      reason: entry.reason || `Package "${name}" is entirely blocked`
    };
  }
  if (entry.blocked_versions && Array.isArray(entry.blocked_versions)) {
    if (version && entry.blocked_versions.includes(version)) {
      return {
        blocked: true,
        reason: entry.reason || `Version ${version} of "${name}" is known malicious`
      };
    }
    if (!version && entry.blocked_versions.length > 0) {
      return {
        blocked: false,
        warning: `Package "${name}" has known malicious versions: ${entry.blocked_versions.join(", ")}. Ensure you are installing a safe version.`
      };
    }
  }
  return { blocked: false };
}
async function checkPackageAge(name, ecosystem) {
  if (ecosystem !== "pypi" && ecosystem !== "npm") {
    return { ageHours: null, blocked: false };
  }
  try {
    const publishDate = await fetchPublishDate(name, ecosystem);
    if (!publishDate) {
      return { ageHours: null, blocked: false };
    }
    const ageMs = Date.now() - publishDate.getTime();
    const ageHours = ageMs / (1e3 * 60 * 60);
    if (ageHours < 24) {
      return {
        ageHours,
        blocked: true,
        warning: `Package "${name}" was published less than 24 hours ago (${Math.round(ageHours)}h). This is suspicious for supply-chain attacks.`
      };
    }
    if (ageHours < 168) {
      const ageDays = Math.round(ageHours / 24);
      return {
        ageHours,
        blocked: false,
        warning: `Package "${name}" was published ${ageDays} day(s) ago. Proceed with caution.`
      };
    }
    return { ageHours, blocked: false };
  } catch {
    return { ageHours: null, blocked: false, error: "Registry check failed (network)" };
  }
}
function fetchPublishDate(name, ecosystem) {
  return new Promise((resolve) => {
    const url = ecosystem === "pypi" ? `https://pypi.org/pypi/${encodeURIComponent(name)}/json` : `https://registry.npmjs.org/${encodeURIComponent(name)}`;
    const timer = setTimeout(() => {
      resolve(null);
    }, 5e3);
    const req = https.get(url, { timeout: 5e3 }, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk.toString();
      });
      res.on("end", () => {
        clearTimeout(timer);
        try {
          const json = JSON.parse(data);
          if (ecosystem === "pypi") {
            const version = json?.info?.version;
            const releases = json?.releases?.[version];
            if (releases && releases.length > 0) {
              resolve(new Date(releases[0].upload_time_iso_8601));
              return;
            }
          } else {
            const latest = json?.["dist-tags"]?.latest;
            const timeEntry = json?.time?.[latest];
            if (timeEntry) {
              resolve(new Date(timeEntry));
              return;
            }
          }
          resolve(null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });
    req.on("timeout", () => {
      req.destroy();
      clearTimeout(timer);
      resolve(null);
    });
  });
}
function stripEnvPrefix(command) {
  return command.replace(/^(\s*[A-Za-z_][A-Za-z0-9_]*=[^\s]*\s+)*/, "");
}
function tokenize(command) {
  const tokens = [];
  let current = "";
  let inQuote = null;
  for (const ch of command) {
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === " " || ch === "	") {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}
function parsePackageToken(token, ecosystem) {
  if (token.includes("/") && !token.startsWith("@") && ecosystem !== "go" && ecosystem !== "composer") {
    return null;
  }
  if (ecosystem === "pypi") {
    const match = token.match(/^([a-zA-Z0-9_.-]+)(?:\[.*?\])?(?:[=<>~!]+(.+))?$/);
    if (match) {
      return { name: match[1], version: match[2] || void 0 };
    }
  } else if (ecosystem === "npm") {
    if (token.startsWith("@")) {
      const lastAt = token.lastIndexOf("@");
      if (lastAt > 0) {
        const name = token.slice(0, lastAt);
        const version = token.slice(lastAt + 1);
        if (name.includes("/")) {
          return { name, version: version || void 0 };
        }
      }
      return { name: token, version: void 0 };
    } else {
      const atIdx = token.indexOf("@");
      if (atIdx > 0) {
        return { name: token.slice(0, atIdx), version: token.slice(atIdx + 1) || void 0 };
      }
      return { name: token, version: void 0 };
    }
  } else if (ecosystem === "go") {
    const atIdx = token.indexOf("@");
    if (atIdx > 0) {
      return { name: token.slice(0, atIdx), version: token.slice(atIdx + 1) };
    }
    return { name: token, version: void 0 };
  } else if (ecosystem === "composer") {
    const colonIdx = token.indexOf(":");
    if (colonIdx > 0) {
      return { name: token.slice(0, colonIdx), version: token.slice(colonIdx + 1) };
    }
    return { name: token, version: void 0 };
  } else {
    return { name: token, version: void 0 };
  }
  return null;
}
function outputDeny(reason) {
  const output = {
    permissionDecision: "deny",
    reason
  };
  console.log(JSON.stringify(output));
  process.exit(2);
}
function outputAllowWithAdvisory(advisory) {
  const output = {
    hookSpecificOutput: {
      additionalContext: advisory
    }
  };
  console.log(JSON.stringify(output));
}
function outputAllowOk() {
  outputContinue();
}
function readStdin() {
  return readFileSync(0, "utf-8");
}
async function main() {
  let input;
  try {
    input = JSON.parse(readStdin());
  } catch {
    outputContinue();
    return;
  }
  if (input.tool_name !== "Bash") {
    outputContinue();
    return;
  }
  const command = input.tool_input.command;
  if (!command) {
    outputContinue();
    return;
  }
  if (!isPackageInstallCommand(command)) {
    outputContinue();
    return;
  }
  if (checkOverride(command)) {
    outputContinue();
    return;
  }
  const ecosystem = parseEcosystem(command);
  if (!ecosystem) {
    outputContinue();
    return;
  }
  const packages = extractPackageNames(command);
  if (packages.length === 0) {
    outputContinue();
    return;
  }
  const advisories = [];
  for (const pkg of packages) {
    if (ecosystem === "pypi" || ecosystem === "npm") {
      const typo = checkTyposquat(pkg.name, ecosystem);
      if (typo.isTyposquat) {
        outputDeny(
          `PACKAGE SECURITY: Suspected typosquat. "${pkg.name}" looks like "${typo.similarTo}". ${typo.reason}. Package: ${pkg.name}. To override: prefix command with SKIP_PACKAGE_GUARD=1`
        );
        return;
      }
    }
    if (ecosystem === "pypi" || ecosystem === "npm") {
      const malCheck = checkMaliciousPackage(pkg.name, pkg.version, ecosystem);
      if (malCheck.blocked) {
        outputDeny(
          `PACKAGE SECURITY: Known malicious package/version. ${malCheck.reason}. Package: ${pkg.name}${pkg.version ? "@" + pkg.version : ""}. To override: prefix command with SKIP_PACKAGE_GUARD=1`
        );
        return;
      }
      if (malCheck.warning) {
        advisories.push(malCheck.warning);
      }
    }
    if (ecosystem === "pypi" || ecosystem === "npm") {
      const ageResult = await checkPackageAge(pkg.name, ecosystem);
      if (ageResult.blocked) {
        outputDeny(
          `PACKAGE SECURITY: ${ageResult.warning} Package: ${pkg.name}. To override: prefix command with SKIP_PACKAGE_GUARD=1`
        );
        return;
      }
      if (ageResult.warning) {
        advisories.push(`PACKAGE ADVISORY: ${ageResult.warning}`);
      }
    }
  }
  if (advisories.length > 0) {
    outputAllowWithAdvisory(advisories.join("\n"));
  } else {
    outputAllowOk();
  }
}
if (!process.env.VITEST) {
  main().catch(() => {
    outputContinue();
  });
}
export {
  checkMaliciousPackage,
  checkOverride,
  extractPackageNames,
  isPackageInstallCommand,
  parseEcosystem
};

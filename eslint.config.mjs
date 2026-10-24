import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Extracts parameter name from an AST parameter node.
 *
 * @param {object} param AST parameter node.
 * @return {string|null} Parameter identifier name, or null if destructured.
 */
function getParamName(param) {
  if (!param) {
    return null;
  }
  if (param.type === 'Identifier') {
    return param.name;
  }
  if (param.type === 'AssignmentPattern' && param.left?.type === 'Identifier') {
    return param.left.name;
  }
  if (param.type === 'RestElement' && param.argument?.type === 'Identifier') {
    return param.argument.name;
  }
  return null;
}

/**
 * Determines whether a function AST node returns a value in its own scope.
 *
 * @param {object} fnNode Function AST node.
 * @return {boolean} True if the function returns a non-void value.
 */
function functionReturnsValue(fnNode) {
  if (!fnNode.body) {
    return false;
  }
  if (fnNode.body.type !== 'BlockStatement') {
    return true;
  }
  const stack = [...(fnNode.body.body ?? [])];
  while (stack.length > 0) {
    const stmt = stack.pop();
    if (!stmt || typeof stmt !== 'object') {
      continue;
    }
    if (
      stmt.type === 'FunctionDeclaration' ||
      stmt.type === 'FunctionExpression' ||
      stmt.type === 'ArrowFunctionExpression'
    ) {
      continue;
    }
    if (stmt.type === 'ReturnStatement' && stmt.argument !== null) {
      return true;
    }
    for (const key of Object.keys(stmt)) {
      if (key === 'parent' || key === 'range' || key === 'loc') {
        continue;
      }
      const child = stmt[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item.type === 'string') {
            stack.push(item);
          }
        }
      } else if (child && typeof child.type === 'string') {
        stack.push(child);
      }
    }
  }
  return false;
}

const googleTsdocRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce Google-style TSDoc docstrings (@fileoverview, summary, @param name description, @return/@returns description, and no redundant {type} annotations).'
    },
    schema: []
  },
  create(context) {
    const sourceCode = context.sourceCode;

    /**
     * Finds the TSDoc block comment (`/** ... * /`) immediately preceding a node.
     *
     * @param {object} node AST node to inspect.
     * @return {object|null} Matching comment token or null.
     */
    function getLeadingTsdoc(node) {
      let target = node;
      if (
        node.parent?.type === 'VariableDeclarator' &&
        node.parent.parent?.type === 'VariableDeclaration'
      ) {
        target = node.parent.parent;
      }
      if (
        target.parent?.type === 'ExportNamedDeclaration' ||
        target.parent?.type === 'ExportDefaultDeclaration'
      ) {
        target = target.parent;
      }
      const comments = sourceCode.getCommentsBefore(target);
      for (let i = comments.length - 1; i >= 0; i--) {
        const c = comments[i];
        if (c.type === 'Block' && c.value.startsWith('*')) {
          const linesBetween = target.loc.start.line - c.loc.end.line;
          if (linesBetween <= 1) {
            return c;
          }
        }
      }
      return null;
    }

    /**
     * Validates a function node against Google TypeScript Style Guide TSDoc requirements.
     *
     * @param {object} fnNode Function AST node.
     * @param {string} fnName Human-readable function name.
     */
    function checkFunctionTsdoc(fnNode, fnName) {
      const tsdoc = getLeadingTsdoc(fnNode);
      if (!tsdoc) {
        context.report({
          node: fnNode,
          message: `Function '${fnName}' is missing a Google-style TSDoc docstring (/** ... */).`
        });
        return;
      }

      const cleaned = tsdoc.value
        .split('\n')
        .map((line) => line.replace(/^\s*\*\s?/, '').trimEnd())
        .join('\n')
        .trim();

      const firstTagIdx = cleaned.search(/(?:^|\n)@\w+/);
      const summary = (firstTagIdx === -1 ? cleaned : cleaned.slice(0, firstTagIdx)).trim();
      if (!summary) {
        context.report({
          node: fnNode,
          message: `TSDoc for '${fnName}' must begin with a non-empty summary description.`
        });
      }

      if (/(?:^|\n)@(?:param|returns?)\s+\{/.test(cleaned)) {
        context.report({
          node: fnNode,
          message: `TSDoc for '${fnName}' must not declare '{type}' annotations in @param or @return/@returns blocks (types belong in the TypeScript signature).`
        });
      }

      const paramTags = new Map();
      const paramRegex =
        /(?:^|\n)@param\s+(?!\{)([A-Za-z_$][\w$]*)\s+(?:-\s+)?(\S.*)/g;
      let match;
      while ((match = paramRegex.exec(cleaned)) !== null) {
        const rawName = match[1].trim();
        const desc = match[2].trim();
        paramTags.set(rawName, { desc });
      }

      for (const param of fnNode.params ?? []) {
        const paramName = getParamName(param);
        if (!paramName) {
          continue;
        }
        const tag = paramTags.get(paramName);
        if (!tag || !tag.desc) {
          context.report({
            node: fnNode,
            message: `TSDoc for '${fnName}' is missing '@param ${paramName} description' (without '{type}').`
          });
        }
      }

      if (functionReturnsValue(fnNode)) {
        const returnMatch = cleaned.match(/(?:^|\n)@returns?\s+(?!\{)(\S.*)/);
        if (!returnMatch || !returnMatch[1].trim()) {
          context.report({
            node: fnNode,
            message: `TSDoc for '${fnName}' is missing '@return description' or '@returns description' (without '{type}').`
          });
        }
      }
    }

    return {
      Program(node) {
        const allComments = sourceCode.getAllComments();
        const hasFileOverview = allComments.some(
          (c) =>
            c.type === 'Block' &&
            c.value.startsWith('*') &&
            /@fileoverview\s+\S+/.test(c.value)
        );
        if (!hasFileOverview) {
          context.report({
            node,
            message: 'File must include a top-level Google-style /** @fileoverview ... */ docstring.'
          });
        }

        for (const c of allComments) {
          if (c.type === 'Block' && c.value.startsWith('*')) {
            if (/@(?:param|returns?)\s+\{/.test(c.value)) {
              context.report({
                loc: c.loc,
                message:
                  'Google-style TSDoc forbids {type} annotations in @param and @return/@returns tags.'
              });
            }
          }
        }
      },
      FunctionDeclaration(node) {
        const name = node.id?.name ?? '<anonymous>';
        checkFunctionTsdoc(node, name);
      },
      VariableDeclarator(node) {
        if (
          node.id?.type === 'Identifier' &&
          (node.init?.type === 'ArrowFunctionExpression' ||
            node.init?.type === 'FunctionExpression') &&
          node.parent?.parent?.type === 'Program'
        ) {
          checkFunctionTsdoc(node.init, node.id.name);
        }
      }
    };
  }
};

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'scripts/**/*.{ts,tsx}'],
    plugins: {
      supa: {
        rules: {
          'google-tsdoc': googleTsdocRule
        }
      }
    },
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['src/main/frontend/vite.config.ts']
        },
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      'supa/google-tsdoc': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' }
      ],
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/no-namespace': 'error',
      'curly': ['error', 'all'],
      'default-case-last': 'error',
      'eqeqeq': ['error', 'always'],
      'no-caller': 'error',
      'no-eval': 'error',
      'no-new-wrappers': 'error',
      'no-throw-literal': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  },
  {
    files: ['scripts/**/*.{ts,tsx,js,cjs,mjs}'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly'
      }
    },
    rules: {
      'no-console': 'off'
    }
  },
  {
    ignores: ['target/**', 'node/**', 'node_modules/**']
  }
);

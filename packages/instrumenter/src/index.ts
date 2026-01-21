import { Project, SourceFile, SyntaxKind } from 'ts-morph';

export interface InstrumentOptions {
  filePath?: string;
}

export interface InstrumentResult {
  code: string;
  success: boolean;
  error?: string;
}

export class CodeInstrumenter {
  private project: Project;

  constructor() {
    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 99, // ESNext
        module: 99, // ESNext
      },
    });
  }

  /**
   * Instrument source code to add tracing
   */
  instrument(sourceCode: string, options: InstrumentOptions = {}): InstrumentResult {
    try {
      // Create source file in memory
      const sourceFile = this.project.createSourceFile(
        options.filePath || 'temp.ts',
        sourceCode,
        { overwrite: true }
      );

      // Transform the code
      this.transformSourceFile(sourceFile);

      // Get the transformed code
      const code = sourceFile.getFullText();

      return {
        code,
        success: true,
      };
    } catch (error) {
      return {
        code: sourceCode,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Transform source file by adding trace calls
   * Note: __trace object is provided by the executor sandbox
   */
  private transformSourceFile(sourceFile: SourceFile): void {
    // Collect all transformations first to avoid node invalidation
    const transformations: Array<{ statement: any; newText: string }> = [];

    // Find array declarations
    transformations.push(...this.collectArrayDeclarations(sourceFile));

    // Find array swaps (destructuring pattern)
    transformations.push(...this.collectArraySwaps(sourceFile));

    // Find array assignments
    transformations.push(...this.collectArrayAssignments(sourceFile));

    // Apply transformations in reverse order (bottom to top of file)
    // This prevents invalidating nodes we haven't processed yet
    transformations
      .sort((a, b) => b.statement.getStart() - a.statement.getStart())
      .forEach(({ statement, newText }) => {
        if (!statement.wasForgotten()) {
          statement.replaceWithText(newText);
        }
      });
  }

  /**
   * Collect array declaration transformations
   */
  private collectArrayDeclarations(sourceFile: SourceFile): Array<{ statement: any; newText: string }> {
    const transformations: Array<{ statement: any; newText: string }> = [];
    const variableDeclarations = sourceFile.getDescendantsOfKind(
      SyntaxKind.VariableDeclaration
    );

    for (const declaration of variableDeclarations) {
      const initializer = declaration.getInitializer();
      const name = declaration.getName();

      // Check if it's an array literal
      if (initializer && initializer.getKind() === SyntaxKind.ArrayLiteralExpression) {
        const statement = declaration.getFirstAncestorByKind(SyntaxKind.VariableStatement);
        if (statement) {
          transformations.push({
            statement,
            newText: `${statement.getText()}\n__trace.declare('${name}', ${name});`
          });
        }
      }
    }

    return transformations;
  }

  /**
   * Collect array swap transformations using destructuring: [arr[i], arr[j]] = [arr[j], arr[i]]
   */
  private collectArraySwaps(sourceFile: SourceFile): Array<{ statement: any; newText: string }> {
    const transformations: Array<{ statement: any; newText: string }> = [];
    const binaryExpressions = sourceFile.getDescendantsOfKind(
      SyntaxKind.BinaryExpression
    );

    for (const expr of binaryExpressions) {
      const operator = expr.getOperatorToken();

      if (operator.getKind() === SyntaxKind.EqualsToken) {
        const left = expr.getLeft();
        const right = expr.getRight();

        // Check if left side is an array destructuring pattern
        if (
          left.getKind() === SyntaxKind.ArrayLiteralExpression &&
          right.getKind() === SyntaxKind.ArrayLiteralExpression
        ) {
          const leftArray = left.asKind(SyntaxKind.ArrayLiteralExpression);
          const rightArray = right.asKind(SyntaxKind.ArrayLiteralExpression);

          if (leftArray && rightArray) {
            const leftElements = leftArray.getElements();
            const rightElements = rightArray.getElements();

            // Only handle 2-element swaps for now (typical swap pattern)
            if (leftElements.length === 2 && rightElements.length === 2) {
              const statement = expr.getFirstAncestorByKind(
                SyntaxKind.ExpressionStatement
              );

              if (statement) {
                // Extract array name and indices from the left side
                const firstLeft = leftElements[0];
                const secondLeft = leftElements[1];

                if (
                  firstLeft?.getKind() === SyntaxKind.ElementAccessExpression &&
                  secondLeft?.getKind() === SyntaxKind.ElementAccessExpression
                ) {
                  const first = firstLeft.asKind(SyntaxKind.ElementAccessExpression);
                  const second = secondLeft.asKind(SyntaxKind.ElementAccessExpression);

                  if (first && second) {
                    const arrayName = first.getExpression().getText();
                    const index1 = first.getArgumentExpression()?.getText();
                    const index2 = second.getArgumentExpression()?.getText();

                    if (index1 && index2) {
                      transformations.push({
                        statement,
                        newText: `${statement.getText()}\n__trace.arrayWrite('${arrayName}', ${index1}, ${arrayName}[${index1}]);\n__trace.arrayWrite('${arrayName}', ${index2}, ${arrayName}[${index2}]);\n__trace.assign('${arrayName}', ${arrayName});`
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return transformations;
  }

  /**
   * Collect array element assignment transformations (arr[i] = value)
   */
  private collectArrayAssignments(sourceFile: SourceFile): Array<{ statement: any; newText: string }> {
    const transformations: Array<{ statement: any; newText: string }> = [];
    const binaryExpressions = sourceFile.getDescendantsOfKind(
      SyntaxKind.BinaryExpression
    );

    for (const expr of binaryExpressions) {
      const operator = expr.getOperatorToken();

      // Look for assignment operators
      if (operator.getKind() === SyntaxKind.EqualsToken) {
        const left = expr.getLeft();

        // Check if left side is array element access (but not destructuring)
        if (left.getKind() === SyntaxKind.ElementAccessExpression) {
          const elementAccess = left.asKind(SyntaxKind.ElementAccessExpression);
          if (elementAccess) {
            const arrayName = elementAccess.getExpression().getText();
            const indexExpr = elementAccess.getArgumentExpression();
            const value = expr.getRight().getText();

            if (indexExpr) {
              const index = indexExpr.getText();

              // Find the statement containing this expression
              const statement = expr.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
              if (statement) {
                transformations.push({
                  statement,
                  newText: `${statement.getText()}\n__trace.arrayWrite('${arrayName}', ${index}, ${value});`
                });
              }
            }
          }
        }
      }
    }

    return transformations;
  }
}

export function instrument(sourceCode: string, options?: InstrumentOptions): InstrumentResult {
  const instrumenter = new CodeInstrumenter();
  return instrumenter.instrument(sourceCode, options);
}

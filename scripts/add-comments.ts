import { Project, Node, SyntaxKind, Statement } from 'ts-morph';

const project = new Project({
    tsConfigFilePath: 'tsconfig.app.json',
});

function toReadable(name: string): string {
    if (!name) return "";
    const result = name.replace(/([A-Z])/g, " $1");
    return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
}

function processSourceFile(sourceFile: any) {
    if (sourceFile.getFilePath().includes('vite-env.d.ts') || sourceFile.getFilePath().includes('components/ui/') || sourceFile.getFilePath().includes('__tests__') || sourceFile.getFilePath().includes('rng.ts') || sourceFile.getFilePath().includes('ClickableName.tsx')) {
        return;
    }

    let modified = false;

    for (const func of sourceFile.getFunctions()) {
        if (!func.getJsDocs().length && func.getName()) {
            const params = func.getParameters().map((p: any) => `\n * @param ${p.getName()} - The ${toReadable(p.getName()).trim()}.`).join('');
            const returnTypeNode = func.getReturnTypeNode();
            const returns = returnTypeNode && returnTypeNode.getText() !== 'void' && returnTypeNode.getText() !== 'Promise<void>'
                ? `\n * @returns The result.` : '';

            func.insertJsDoc(0, { description: `${toReadable(func.getName() as string).trim()}.${params}${returns}` });
            modified = true;
        }
    }

    for (const cls of sourceFile.getClasses()) {
        if (!cls.getJsDocs().length && cls.getName()) {
            cls.insertJsDoc(0, { description: `Represents a ${toReadable(cls.getName() as string).trim()}.` });
            modified = true;
        }

        for (const method of cls.getMethods()) {
            if (!method.getJsDocs().length && method.getName() && method.getName() !== 'constructor') {
                const params = method.getParameters().map((p: any) => `\n * @param ${p.getName()} - The ${toReadable(p.getName()).trim()}.`).join('');
                const desc = `${toReadable(method.getName()).trim()}.${params}`;
                method.insertJsDoc(0, { description: desc });
                modified = true;
            }
        }
    }

    for (const iface of sourceFile.getInterfaces()) {
        if (!iface.getJsDocs().length && iface.getName()) {
            iface.insertJsDoc(0, { description: `Defines the structure for ${toReadable(iface.getName()).trim()}.` });
            modified = true;
        }
    }

    for (const typeAlias of sourceFile.getTypeAliases()) {
        if (!typeAlias.getJsDocs().length && typeAlias.getName()) {
            typeAlias.insertJsDoc(0, { description: `Type representing ${toReadable(typeAlias.getName()).trim()}.` });
            modified = true;
        }
    }

    for (const varStmt of sourceFile.getVariableStatements()) {
        if (!varStmt.getJsDocs().length && varStmt.isExported()) {
            const declarations = varStmt.getDeclarations();
            if (declarations.length === 1) {
                const name = declarations[0].getName();
                if (name) {
                    varStmt.insertJsDoc(0, { description: `${toReadable(name).trim()}.` });
                    modified = true;
                }
            }
        }
    }

    if (modified) {
        sourceFile.saveSync();
        console.log(`Updated comments in ${sourceFile.getFilePath()}`);
    }
}

const sourceFiles = project.getSourceFiles();
console.log(`Processing ${sourceFiles.length} files...`);
for (const file of sourceFiles) {
    processSourceFile(file);
}
console.log("Done!");

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

function generateSubTestJSON(
  name: string,
  path: string,
  buildTags: string
): string {
  return JSON.stringify(
    {
      name: name,
      type: "go",
      request: "launch",
      program: path,
      buildFlags: `-tags '${buildTags}'`,
      args: ["-test.run", name],
    },
    null,
    2
  );
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "go-subtest" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "go-subtest.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      const editor = vscode.window.activeTextEditor;
      if (vscode.workspace.workspaceFolders === undefined) {
        vscode.window.showErrorMessage(
          "extension must be ran in a vscode workspace"
        );
        return;
      }
      const path = vscode.workspace.workspaceFolders[0].uri.path;

      if (editor) {
        const cursorPosNum = editor.document.offsetAt(editor.selection.active);
        const cursorPos = editor.document.positionAt(cursorPosNum);
        // get all words surround in quotes
        const wordRange = editor.document.getWordRangeAtPosition(
          cursorPos,
          /".*"/
        );
        let subTestName = editor.document.getText(wordRange);
        subTestName = subTestName.replaceAll('"', "");
        subTestName = subTestName.replaceAll(" ", "_");

        // list all symbols in the document
        vscode.commands
          .executeCommand<vscode.DocumentSymbol[]>(
            "vscode.executeDocumentSymbolProvider",
            editor.document.uri
          )
          .then((symbols) => {
            for (const symbol of symbols) {
              const testName = symbol.name;
              if (!testName.startsWith("Test")) {
                vscode.window.showErrorMessage(
                  "this is not a go test function"
                );
                return;
              }
              // get current symbol cursor is focused on
              if (symbol.range.contains(cursorPos)) {
                const currentSubTest = testName + "/" + subTestName;

                // find build tags
                let buildTags = "";
                const documentText = editor.document.getText();
                const match = documentText.match("//go:build");
                if (match && match.index) {
                  const matchPos = editor.document.positionAt(match.index);
                  const line = editor.document.lineAt(matchPos);
                  buildTags = line.text.replace("//go:build", "");
                }

                const json = generateSubTestJSON(
                  currentSubTest,
                  path,
                  buildTags
                );
                // write generated json to clipboard
                vscode.env.clipboard.writeText(json).then(() => {
                  vscode.window.showInformationMessage(
                    `copied ${currentSubTest} JSON. Add it to your launch.json`
                  );
                });
              }
            }
          });
      } else {
        vscode.window.showErrorMessage("cursor needs to be on a word");
      }
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

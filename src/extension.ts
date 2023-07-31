// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

function getPath(): string {
  if (!vscode.workspace.workspaceFolders) {
    vscode.window.showErrorMessage(
      "Extension must be ran in a vscode workspace"
    );
    throw new Error("Extension must be ran in a vscode workspace");
  }
  return vscode.workspace.workspaceFolders[0].uri.path;
}

function getEditor(): vscode.TextEditor {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("Editor window not open");
    throw new Error("Editor window not open");
  }
  return editor;
}

// returns the position of the string in the file
function findStringMatch(matchStr: string): vscode.Position {
  const editor = getEditor();
  const documentText = editor.document.getText();
  const match = documentText.match(matchStr);
  if (!match) {
    throw new Error(`match ${matchStr} not found in current file`);
  }
  let matchIndex = 0;
  if (match.index) {
    matchIndex = match.index;
  }
  return editor.document.positionAt(matchIndex);
}

function generateSubTestJSON(name: string, path: string, buildTags: string) {
  return {
    name: name,
    type: "go",
    request: "launch",
    program: path,
    buildFlags: `-tags '${buildTags}'`,
    args: ["-test.run", name],
  };
}

function openLaunchConfiguration(testName: string) {
  const path = getPath();
  vscode.workspace
    .openTextDocument(path + "/.vscode/launch.json")
    .then((launch) => {
      vscode.window.showTextDocument(launch).then((editor) => {
        // move cursor to current test config
        const pos = findStringMatch(testName);
        editor.selection = new vscode.Selection(pos, pos);
      });
    });
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
      try {
        const editor = getEditor();
        if (editor.document.languageId != "go") {
          vscode.window.showErrorMessage("Not a go file");
          throw new Error("Not a go file");
        }
        const path = getPath();

        // get current subtest name cursor is on
        // get current cursor line
        const cursorPosNum = editor.document.offsetAt(editor.selection.active);
        const cursorPos = editor.document.positionAt(cursorPosNum);
        // get all words surround in quotes (the subtest name)
        const line = editor.document.lineAt(cursorPos);
        if (line.isEmptyOrWhitespace) {
          return;
        }
        const match = line.text.match(/".*"/);
        if (!match) {
          return;
        }
        const subTestName = match[0].replaceAll('"', "").replaceAll(" ", "_");

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
                  "This is not a go test function"
                );
                return;
              }
              // get current symbol cursor is focused on
              if (symbol.range.contains(cursorPos)) {
                const currentSubTest = testName + "/" + subTestName;

                // find go build tags
                const pos = findStringMatch("//go:build");
                const line = editor.document.lineAt(pos);
                const buildTags = line.text.replace("//go:build", "");

                const json = generateSubTestJSON(
                  currentSubTest,
                  path,
                  buildTags
                );
                // write generated json to launch.json
                if (!vscode.workspace.workspaceFolders) {
                  vscode.window.showErrorMessage(
                    "Extension must be ran in a vscode workspace"
                  );
                  return;
                }

                const launch = vscode.workspace.getConfiguration(
                  "launch",
                  vscode.workspace.workspaceFolders[0].uri
                );
                const config = launch.get("configurations");
                if (config instanceof Array) {
                  // check if config already exists
                  for (let i = 0; i < config.length; i++) {
                    if (config[i].name == currentSubTest) {
                      vscode.window
                        .showWarningMessage(
                          "launch.json config already exists",
                          "Open launch.json"
                        )
                        .then(() => openLaunchConfiguration(currentSubTest));
                      return;
                    }
                  }
                  config.push(json);
                  launch.update("configurations", config);
                } else {
                  vscode.window.showErrorMessage(
                    "Configuration field in launch.json should be an array"
                  );
                  return;
                }

                // TODO(kperath): see README
                // vscode.env.clipboard.writeText(json).then(() => {
                // });
                vscode.window
                  .showInformationMessage(
                    `Added ${currentSubTest} launch.json`,
                    "Open launch.json"
                  )
                  .then(() => openLaunchConfiguration(currentSubTest));
              }
            }
          });
      } catch (err) {
        console.log(err);
      }
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

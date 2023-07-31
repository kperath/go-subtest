// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

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
  if (!vscode.workspace.workspaceFolders) {
    vscode.window.showErrorMessage(
      "Extension must be ran in a vscode workspace"
    );
    return;
  }
  const path = vscode.workspace.workspaceFolders[0].uri.path;
  vscode.workspace
    .openTextDocument(path + "/.vscode/launch.json")
    .then((launch) => {
      vscode.window.showTextDocument(launch).then((editor) => {
        const documentText = editor.document.getText();
        const match = documentText.match(testName);
        if (match) {
          let matchIndex = 0;
          if (match.index) {
            matchIndex = match.index;
          }
          const matchPos = editor.document.positionAt(matchIndex);
          if (vscode.window.activeTextEditor) {
            vscode.window.activeTextEditor.selections = [
              new vscode.Selection(matchPos, matchPos),
            ];
          }
        }
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
      const editor = vscode.window.activeTextEditor;
      if (!vscode.workspace.workspaceFolders) {
        vscode.window.showErrorMessage(
          "Extension must be ran in a vscode workspace"
        );
        return;
      }
      const path = vscode.workspace.workspaceFolders[0].uri.path;

      if (!editor) {
        vscode.window.showErrorMessage("Editor window not open");
        return;
      }
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
              vscode.window.showErrorMessage("This is not a go test function");
              return;
            }
            // get current symbol cursor is focused on
            if (symbol.range.contains(cursorPos)) {
              const currentSubTest = testName + "/" + subTestName;

              // find build tags
              let buildTags = "";
              const documentText = editor.document.getText();
              const match = documentText.match("//go:build");
              if (match) {
                let matchIndex = 0;
                if (match.index) {
                  matchIndex = match.index;
                }
                const matchPos = editor.document.positionAt(matchIndex);
                const line = editor.document.lineAt(matchPos);
                buildTags = line.text.replace("//go:build", "");
              }

              const json = generateSubTestJSON(currentSubTest, path, buildTags);
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
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

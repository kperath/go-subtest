// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

function getURI(): vscode.Uri {
  if (!vscode.workspace.workspaceFolders) {
    vscode.window.showErrorMessage(
      "Extension must be ran in a vscode workspace"
    );
    throw new Error("Extension must be ran in a vscode workspace");
  }
  return vscode.workspace.workspaceFolders[0].uri;
}

function getEditor(): vscode.TextEditor {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("Editor window not open");
    throw new Error("Editor window not open");
  }
  return editor;
}

async function getCurrentSymbol(
  cursorPos: vscode.Position
): Promise<vscode.DocumentSymbol> {
  const editor = getEditor();
  // list all symbols in the document
  const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
    "vscode.executeDocumentSymbolProvider",
    editor.document.uri
  );

  // get current function name (symbol) cursor is focused on
  for (const symbol of symbols) {
    if (symbol.range.contains(cursorPos)) {
      return symbol;
    }
  }
  throw new Error("current symbol not found");
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

async function openLaunchConfiguration(testName: string) {
  const uri = getURI();
  const config = await vscode.workspace.openTextDocument(
    uri.path + "/.vscode/launch.json"
  );
  const editor = await vscode.window.showTextDocument(config);
  // move cursor to current test config
  const pos = findStringMatch(testName);
  editor.selection = new vscode.Selection(pos, pos);
  // show moved cursor on screen
  editor.revealRange(
    new vscode.Range(pos, pos),
    vscode.TextEditorRevealType.InCenter
  );
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "go-subtest" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "go-subtest.helloWorld",
    async () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      try {
        const editor = getEditor();
        if (editor.document.languageId != "go") {
          vscode.window.showErrorMessage("Not a go file");
          throw new Error("Not a go file");
        }
        const uri = getURI();

        // get current subtest name cursor is on
        // get current cursor line
        const cursorPosNum = editor.document.offsetAt(editor.selection.active);
        const cursorPos = editor.document.positionAt(cursorPosNum);
        // get all words surround in quotes (the subtest name)
        let line = editor.document.lineAt(cursorPos);
        if (line.isEmptyOrWhitespace) {
          return;
        }
        const match = line.text.match(/".*"/);
        if (!match) {
          return;
        }
        const subTestName = match[0].replaceAll('"', "").replaceAll(" ", "_");

        // get current function name (symbol) cursor is focused on
        const symbol = await getCurrentSymbol(cursorPos);

        const testName = symbol.name;
        if (!testName.startsWith("Test")) {
          vscode.window.showErrorMessage("This is not a go test function");
          throw new Error("This is not a go test function");
        }

        const subTest = testName + "/" + subTestName;

        // find go build tags
        const pos = findStringMatch("//go:build");
        line = editor.document.lineAt(pos);
        const buildTags = line.text.replace("//go:build ", "");

        // write generated json to launch.json
        const json = generateSubTestJSON(subTest, uri.path, buildTags);
        const launch = vscode.workspace.getConfiguration("launch", uri);
        const config = launch.get("configurations");
        if (config instanceof Array) {
          // check if config already exists
          for (let i = 0; i < config.length; i++) {
            if (config[i].name == subTest) {
              await vscode.window
                .showWarningMessage(
                  "launch.json config already exists",
                  "Open launch.json"
                )
                .then(() => openLaunchConfiguration(subTest));
              return;
            }
          }
          config.push(json);
          launch.update("configurations", config);
        } else {
          vscode.window.showErrorMessage(
            "Configuration field in launch.json should be an array"
          );
          throw new Error(
            "Configuration field in launch.json should be an array"
          );
        }

        // TODO(kperath): see README
        // vscode.env.clipboard.writeText(json).then(() => {
        // });
        await vscode.window
          .showInformationMessage(
            `Added ${subTest} launch.json`,
            "Open launch.json"
          )
          .then(() => openLaunchConfiguration(subTest));
      } catch (err) {
        console.log(err);
      }
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

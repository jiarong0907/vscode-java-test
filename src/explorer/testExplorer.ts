// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as path from 'path';
import { Command, Disposable, Event, EventEmitter, ExtensionContext, Range, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, workspace, WorkspaceFolder } from 'vscode';
import { JavaTestRunnerCommands } from '../constants/commands';
import { ITestItem, TestKind, TestLevel } from '../protocols';
import { ITestResult, TestStatus } from '../runners/models';
import { testItemModel } from '../testItemModel';
import { testResultManager } from '../testResultManager';

export class TestExplorer implements TreeDataProvider<ITestItem>, Disposable {
    public readonly testExplorerViewId: string = 'testExplorer';

    private onDidChangeTreeDataEventEmitter: EventEmitter<ITestItem | null| undefined> = new EventEmitter<ITestItem | null | undefined>();
    // tslint:disable-next-line:member-ordering
    public readonly onDidChangeTreeData: Event<ITestItem | null | undefined> = this.onDidChangeTreeDataEventEmitter.event;

    private _context: ExtensionContext;

    public initialize(context: ExtensionContext): void {
        this._context = context;
    }

    public getTreeItem(element: ITestItem): TreeItem | Thenable<TreeItem> {
        return {
            label: element.displayName,
            collapsibleState: this.resolveCollapsibleState(element),
            command: this.resolveCommand(element),
            iconPath: this.resolveIconPath(element),
            contextValue: element.level.toString(),
        };
    }

    public async getChildren(element?: ITestItem): Promise<ITestItem[]> {
        let nodes: ITestItem[] = [];
        if (!element) {
            nodes = this.getWorkspaceFolders();
        } else {
            nodes = await testItemModel.getNodeChildren(element);
        }
        return nodes.sort((a: ITestItem, b: ITestItem) => a.displayName.localeCompare(b.displayName));
    }

    public refresh(element?: ITestItem): void {
        this.onDidChangeTreeDataEventEmitter.fire(element);
    }

    public dispose(): void {
        this.onDidChangeTreeDataEventEmitter.dispose();
    }

    private getWorkspaceFolders(): ITestItem[] {
        let results: ITestItem[] = [];
        const folders: WorkspaceFolder[] | undefined = workspace.workspaceFolders;
        if (folders) {
            results = folders.map((folder: WorkspaceFolder) => {
                return {
                    id: folder.uri.fsPath,
                    displayName: folder.name,
                    fullName: folder.name,
                    kind: TestKind.None,
                    project: '',
                    level: TestLevel.Folder,
                    paramTypes: [],
                    location: {
                        uri: folder.uri.toString(),
                        range: new Range(0, 0, 0, 0),
                    },
                    children: undefined,
                };
            });
        }
        return results;
    }

    private resolveCollapsibleState(element: ITestItem): TreeItemCollapsibleState {
        if (element.level === TestLevel.Method) {
            return TreeItemCollapsibleState.None;
        }
        return TreeItemCollapsibleState.Collapsed;
    }

    private resolveIconPath(element: ITestItem): undefined | { dark: string | Uri, light: string | Uri } {
        switch (element.level) {
            case TestLevel.Method:
                const result: ITestResult | undefined = testResultManager.getResultById(element.id);
                if (result) {
                    if (result.status === TestStatus.Pass) {
                        return {
                            dark: this._context.asAbsolutePath(path.join('resources', 'media', 'dark', 'pass.svg')),
                            light: this._context.asAbsolutePath(path.join('resources', 'media', 'light', 'pass.svg')),
                        };
                    } else if (result.status === TestStatus.Fail) {
                        return {
                            dark: this._context.asAbsolutePath(path.join('resources', 'media', 'dark', 'error.svg')),
                            light: this._context.asAbsolutePath(path.join('resources', 'media', 'light', 'error.svg')),
                        };
                    }
                }

                return {
                    dark: this._context.asAbsolutePath(path.join('resources', 'media', 'dark', 'method.svg')),
                    light: this._context.asAbsolutePath(path.join('resources', 'media', 'light', 'method.svg')),
                };
            case TestLevel.Class:
                return {
                    dark: this._context.asAbsolutePath(path.join('resources', 'media', 'dark', 'class.svg')),
                    light: this._context.asAbsolutePath(path.join('resources', 'media', 'light', 'class.svg')),
                };
            case TestLevel.Package:
                return {
                    dark: this._context.asAbsolutePath(path.join('resources', 'media', 'dark', 'package.svg')),
                    light: this._context.asAbsolutePath(path.join('resources', 'media', 'light', 'package.svg')),
                };
            default:
                return undefined;
        }
    }

    private resolveCommand(element: ITestItem): Command | undefined {
        if (element.level >= TestLevel.Class) {
            return {
                command: JavaTestRunnerCommands.OPEN_DOCUMENT,
                title: '',
                arguments: [Uri.parse(element.location.uri), element.location.range],
            };
        }
        return undefined;
    }
}

export const testExplorer: TestExplorer = new TestExplorer();

/*
 * Copyright (c) 2020-Present Erlend Oftedal, Steve Springett, Sonatype, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import chalk from "chalk";
import { DepGraph } from "dependency-graph";
import { Component as CycloneDXComponent} from '../CycloneDX/Types/Component';

const tree = `├`;
const dash = '─';
const branch = '┬';
const elbow = `└`;
const pipe = `|`;

class Node {
  public name: string;
  private depth: number;
  public dependencies: Array<Node>;

  constructor(name: string, depth: number) {
    this.name = name;
    this.depth = depth;
    this.dependencies = new Array();
  }

  public getDepth(): number {
    return this.depth;
  }

  public prettyPrintTree(ident: string, last: boolean) {
    let rootDepText = chalk.bgBlack(chalk.green(chalk.bold(`${this.name} - root package`)));
    let iAmJustABadDepText = chalk.bgBlack(chalk.red(chalk.bold(`${this.name} - direct dependency`)));
    let indirectlyResponsibleText = chalk.bgBlack(chalk.yellow(chalk.bold(`${this.name} - indirectly responsible`)));
    let transitiveResponsibleText = chalk.bgBlack(chalk.red(chalk.bold(`${this.name} - directly responsible`)));
    let str = "";
    str += ident;
    if (last) {
      str += `${elbow}${dash} `;
      ident += "  ";
    } else {
      str += `${tree}${dash} `;
      ident += pipe + " ";
    }

    const directlyResponsible = (this.depth == 1);
    const isBottomDep = (this.dependencies.length == 0);
    const isDirectDependencyInChargeOfThings = (this.dependencies.length == 1 && this.dependencies[0].dependencies.length == 0);

    switch (true) {
      case (directlyResponsible && !isBottomDep): 
        console.log(`${str}${transitiveResponsibleText}`);
        break;
      case (isBottomDep): {
        console.log(`${str}${rootDepText}`);
        break;
      }
      case (isDirectDependencyInChargeOfThings && this.depth != 0): 
        console.log(`${str}${indirectlyResponsibleText}`);
        break;
      case (isDirectDependencyInChargeOfThings && this.depth == 0):
        console.log(`${str}${iAmJustABadDepText}`);
        break;
      case (directlyResponsible):
        console.log(`${str}${transitiveResponsibleText}`);
        break;
      default:
        console.log(`${str}${this.name}`);
        break;
    }

    this.dependencies.map((dep, i, arr) => {
      dep.prettyPrintTree(ident, i == this.dependencies.length - 1);
    });
  }
}

export class AuditGraph {
  constructor(readonly graph: DepGraph<CycloneDXComponent>) {}

  public printGraph(rootComponent: string) {
    const rootNode = new Node(rootComponent, 0);

    this.constructTree(rootNode, rootComponent);
    rootNode.prettyPrintTree("", true);
  }

  private constructTree(tree: Node, purl: string) {
    const deps = this.graph!.directDependenciesOf(purl);
    if (deps && deps.length > 0) {
      deps?.map((dep) => {
        const depNode = new Node(dep, tree.getDepth() + 1);
        if (this.graph!.directDependenciesOf(dep).length == 0) {
          if (deps.length == 1) {
            tree.dependencies.push(depNode);
          }
        } else {
          this.constructTree(depNode, dep);
          tree.dependencies.push(depNode);
        }
      });
    } else {
      const depNode = new Node(purl, tree.getDepth() + 1);
      tree.dependencies.push(depNode);
    }
  }
}

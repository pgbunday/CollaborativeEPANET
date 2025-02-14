'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var epanetEngine = require('@model-create/epanet-engine');

var Workspace =
/*#__PURE__*/

/** @class */
function () {
  function Workspace() {
    this._instance = epanetEngine.epanetEngine;
    this._FS = this._instance.FS;
  }

  Object.defineProperty(Workspace.prototype, "version", {
    get: function get() {
      var intPointer = this._instance._malloc(4);

      this._instance.getversion(intPointer);

      var returnValue = this._instance.getValue(intPointer, 'i32');

      this._instance._free(intPointer);

      return returnValue;
    },
    enumerable: true,
    configurable: true
  });

  Workspace.prototype.getError = function (code) {
    var title1Ptr = this._instance._malloc(256); //EN_MAXMSG


    this._instance.geterror(code, title1Ptr);

    var errMessage = this._instance.UTF8ToString(title1Ptr);

    this._instance._free(title1Ptr);

    return errMessage;
  };

  Workspace.prototype.writeFile = function (path, data) {
    this._FS.writeFile(path, data);
  };

  Workspace.prototype.readFile = function (file, encoding) {
    if (!encoding || encoding === 'utf8') {
      encoding = 'utf8';
      return this._FS.readFile(file, {
        encoding: encoding
      });
    }

    return this._FS.readFile(file, {
      encoding: encoding
    });
  };

  return Workspace;
}();

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

var _assign = function __assign() {
  _assign = Object.assign || function __assign(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];

      for (var p in s) {
        if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
    }

    return t;
  };

  return _assign.apply(this, arguments);
};
function __spreadArrays() {
  for (var s = 0, i = 0, il = arguments.length; i < il; i++) {
    s += arguments[i].length;
  }

  for (var r = Array(s), k = 0, i = 0; i < il; i++) {
    for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++) {
      r[k] = a[j];
    }
  }

  return r;
}

var ProjectFunctions =
/*#__PURE__*/

/** @class */
function () {
  function ProjectFunctions() {}

  ProjectFunctions.prototype.close = function () {
    this._checkError(this._EN.close());
  };

  ProjectFunctions.prototype.getCount = function (obj) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).getcount.apply(_a, __spreadArrays([obj], memory)));

    return this._getValue(memory[0], 'int');
  };

  ProjectFunctions.prototype.getTitle = function () {
    var _a;

    var memory = this._allocateMemory('char-title', 'char-title', 'char-title');

    this._checkError((_a = this._EN).gettitle.apply(_a, memory));

    return {
      line1: this._getValue(memory[0], 'char'),
      line2: this._getValue(memory[1], 'char'),
      line3: this._getValue(memory[2], 'char')
    };
  };

  ProjectFunctions.prototype.init = function (rptFile, outFile, unitType, headLosstype) {
    this._checkError(this._EN.init(rptFile, outFile, unitType, headLosstype));
  };

  ProjectFunctions.prototype.open = function (inputFile, reportFile, outputFile) {
    this._checkError(this._EN.open(inputFile, reportFile, outputFile));
  }; // TODO: Include ability to have callback here


  ProjectFunctions.prototype.runProject = function (inputFile, reportFile, outputFile) {
    this._checkError(this._EN.runproject(inputFile, reportFile, outputFile));
  };

  ProjectFunctions.prototype.saveInpFile = function (filename) {
    this._checkError(this._EN.saveinpfile(filename));
  };

  ProjectFunctions.prototype.setTitle = function (line1, line2, line3) {
    this._checkError(this._EN.settitle(line1, line2, line3));
  };

  return ProjectFunctions;
}();

var NetworkNodeFunctions =
/*#__PURE__*/

/** @class */
function () {
  function NetworkNodeFunctions() {}

  NetworkNodeFunctions.prototype.addNode = function (id, nodeType) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).addnode.apply(_a, __spreadArrays([id, nodeType], memory)));

    return this._getValue(memory[0], 'int');
  };

  NetworkNodeFunctions.prototype.deleteNode = function (index, actionCode) {
    this._checkError(this._EN.deletenode(index, actionCode));
  };

  NetworkNodeFunctions.prototype.getNodeIndex = function (id) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).getnodeindex.apply(_a, __spreadArrays([id], memory)));

    return this._getValue(memory[0], 'int');
  };

  NetworkNodeFunctions.prototype.getNodeId = function (index) {
    var _a;

    var memory = this._allocateMemory('char');

    this._checkError((_a = this._EN).getnodeid.apply(_a, __spreadArrays([index], memory)));

    return this._getValue(memory[0], 'char');
  };

  NetworkNodeFunctions.prototype.setNodeId = function (index, newid) {
    this._checkError(this._EN.setnodeid(index, newid));
  };

  NetworkNodeFunctions.prototype.getNodeType = function (index) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).getnodetype.apply(_a, __spreadArrays([index], memory)));

    return this._getValue(memory[0], 'int');
  };

  NetworkNodeFunctions.prototype.getNodeValue = function (index, property) {
    var _a;

    var memory = this._allocateMemory('double');

    this._checkError((_a = this._EN).getnodevalue.apply(_a, __spreadArrays([index, property], memory)));

    return this._getValue(memory[0], 'double');
  };

  NetworkNodeFunctions.prototype.setNodeValue = function (index, property, value) {
    this._checkError(this._EN.setnodevalue(index, property, value));
  };

  NetworkNodeFunctions.prototype.setJunctionData = function (index, elev, dmnd, dmndpat) {
    this._checkError(this._EN.setjuncdata(index, elev, dmnd, dmndpat));
  };

  NetworkNodeFunctions.prototype.setTankData = function (index, elev, initlvl, minlvl, maxlvl, diam, minvol, volcurve) {
    this._checkError(this._EN.settankdata(index, elev, initlvl, minlvl, maxlvl, diam, minvol, volcurve));
  };

  NetworkNodeFunctions.prototype.getCoordinates = function (index) {
    var _a;

    var memory = this._allocateMemory('double', 'double');

    this._checkError((_a = this._EN).getcoord.apply(_a, __spreadArrays([index], memory)));

    return {
      x: this._getValue(memory[0], 'double'),
      y: this._getValue(memory[1], 'double')
    };
  };

  NetworkNodeFunctions.prototype.setCoordinates = function (index, x, y) {
    this._checkError(this._EN.setcoord(index, x, y));
  };

  return NetworkNodeFunctions;
}();

var HydraulicAnalysisFunctions =
/*#__PURE__*/

/** @class */
function () {
  function HydraulicAnalysisFunctions() {}

  HydraulicAnalysisFunctions.prototype.solveH = function () {
    this._checkError(this._EN.solveH());
  };

  HydraulicAnalysisFunctions.prototype.useHydFile = function (filename) {
    this._checkError(this._EN.usehydfile(filename));
  };

  HydraulicAnalysisFunctions.prototype.openH = function () {
    this._checkError(this._EN.openH());
  };

  HydraulicAnalysisFunctions.prototype.initH = function (initFlag) {
    this._checkError(this._EN.initH(initFlag));
  };

  HydraulicAnalysisFunctions.prototype.runH = function () {
    var _a;

    var memory = this._allocateMemory('long');

    this._checkError((_a = this._EN).runH.apply(_a, memory));

    return this._getValue(memory[0], 'long');
  };

  HydraulicAnalysisFunctions.prototype.nextH = function () {
    var _a;

    var memory = this._allocateMemory('long');

    this._checkError((_a = this._EN).nextH.apply(_a, memory));

    return this._getValue(memory[0], 'long');
  };

  HydraulicAnalysisFunctions.prototype.saveH = function () {
    this._checkError(this._EN.saveH());
  };

  HydraulicAnalysisFunctions.prototype.saveHydFile = function (filename) {
    this._checkError(this._EN.savehydfile(filename));
  };

  HydraulicAnalysisFunctions.prototype.closeH = function () {
    this._checkError(this._EN.closeH());
  };

  return HydraulicAnalysisFunctions;
}();

var WaterQualityAnalysisFunctions =
/*#__PURE__*/

/** @class */
function () {
  function WaterQualityAnalysisFunctions() {}

  WaterQualityAnalysisFunctions.prototype.solveQ = function () {
    this._checkError(this._EN.solveQ());
  };

  WaterQualityAnalysisFunctions.prototype.openQ = function () {
    this._checkError(this._EN.openQ());
  };

  WaterQualityAnalysisFunctions.prototype.initQ = function (initFlag) {
    this._checkError(this._EN.initQ(initFlag));
  };

  WaterQualityAnalysisFunctions.prototype.runQ = function () {
    var _a;

    var memory = this._allocateMemory('long');

    this._checkError((_a = this._EN).runQ.apply(_a, memory));

    return this._getValue(memory[0], 'long');
  };

  WaterQualityAnalysisFunctions.prototype.nextQ = function () {
    var _a;

    var memory = this._allocateMemory('long');

    this._checkError((_a = this._EN).nextQ.apply(_a, memory));

    return this._getValue(memory[0], 'long');
  };

  WaterQualityAnalysisFunctions.prototype.stepQ = function () {
    var _a;

    var memory = this._allocateMemory('long');

    this._checkError((_a = this._EN).stepQ.apply(_a, memory));

    return this._getValue(memory[0], 'long');
  };

  WaterQualityAnalysisFunctions.prototype.closeQ = function () {
    this._checkError(this._EN.closeQ());
  };

  return WaterQualityAnalysisFunctions;
}();

var ReportingFunctions =
/*#__PURE__*/

/** @class */
function () {
  function ReportingFunctions() {}

  ReportingFunctions.prototype.writeLine = function (line) {
    this._checkError(this._EN.writeline(line));
  };

  ReportingFunctions.prototype.report = function () {
    this._checkError(this._EN.report());
  };

  ReportingFunctions.prototype.copyReport = function (filename) {
    this._checkError(this._EN.copyreport(filename));
  };

  ReportingFunctions.prototype.clearReport = function () {
    this._checkError(this._EN.clearreport());
  };

  ReportingFunctions.prototype.resetReport = function () {
    this._checkError(this._EN.resetreport());
  };

  ReportingFunctions.prototype.setReport = function (format) {
    this._checkError(this._EN.setreport(format));
  };

  ReportingFunctions.prototype.setStatusReport = function (level) {
    this._checkError(this._EN.setstatusreport(level));
  };

  ReportingFunctions.prototype.getStatistic = function (type) {
    var _a;

    var memory = this._allocateMemory('double');

    this._checkError((_a = this._EN).getstatistic.apply(_a, __spreadArrays([type], memory)));

    return this._getValue(memory[0], 'double');
  };

  ReportingFunctions.prototype.getResultIndex = function (type, index) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).getresultindex.apply(_a, __spreadArrays([type, index], memory)));

    return this._getValue(memory[0], 'int');
  };

  return ReportingFunctions;
}();

var AnalysisOptionsFunctions =
/*#__PURE__*/

/** @class */
function () {
  function AnalysisOptionsFunctions() {}

  AnalysisOptionsFunctions.prototype.getFlowUnits = function () {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).getflowunits.apply(_a, memory));

    return this._getValue(memory[0], 'int');
  };

  AnalysisOptionsFunctions.prototype.getOption = function (option) {
    var _a;

    var memory = this._allocateMemory('double');

    this._checkError((_a = this._EN).getoption.apply(_a, __spreadArrays([option], memory)));

    return this._getValue(memory[0], 'double');
  };

  AnalysisOptionsFunctions.prototype.getQualityInfo = function () {
    var _a;

    var memory = this._allocateMemory('int', 'char', 'char', 'int');

    this._checkError((_a = this._EN).getqualinfo.apply(_a, memory));

    return {
      qualType: this._getValue(memory[0], 'int'),
      chemName: this._getValue(memory[1], 'char'),
      chemUnits: this._getValue(memory[2], 'char'),
      traceNode: this._getValue(memory[3], 'int')
    };
  };

  AnalysisOptionsFunctions.prototype.getQualityType = function () {
    var _a;

    var memory = this._allocateMemory('int', 'int');

    this._checkError((_a = this._EN).getqualtype.apply(_a, memory));

    return {
      qualType: this._getValue(memory[0], 'int'),
      traceNode: this._getValue(memory[1], 'int')
    };
  };

  AnalysisOptionsFunctions.prototype.getTimeParameter = function (param) {
    var _a;

    var memory = this._allocateMemory('long');

    this._checkError((_a = this._EN).gettimeparam.apply(_a, __spreadArrays([param], memory)));

    return this._getValue(memory[0], 'long');
  };

  AnalysisOptionsFunctions.prototype.setFlowUnits = function (units) {
    this._checkError(this._EN.setflowunits(units));
  };

  AnalysisOptionsFunctions.prototype.setOption = function (option, value) {
    this._checkError(this._EN.setoption(option, value));
  };

  AnalysisOptionsFunctions.prototype.setQualityType = function (qualType, chemName, chemUnits, traceNode) {
    this._checkError(this._EN.setqualtype(qualType, chemName, chemUnits, traceNode));
  };

  AnalysisOptionsFunctions.prototype.setTimeParameter = function (param, value) {
    this._checkError(this._EN.settimeparam(param, value));
  };

  return AnalysisOptionsFunctions;
}();

var NodalDemandFunctions =
/*#__PURE__*/

/** @class */
function () {
  function NodalDemandFunctions() {}

  NodalDemandFunctions.prototype.addDemand = function (nodeIndex, baseDemand, demandPattern, demandName) {
    this._checkError(this._EN.adddemand(nodeIndex, baseDemand, demandPattern, demandName));
  };

  NodalDemandFunctions.prototype.deleteDemand = function (nodeIndex, demandIndex) {
    this._checkError(this._EN.deletedemand(nodeIndex, demandIndex));
  };

  NodalDemandFunctions.prototype.getBaseDemand = function (nodeIndex, demandIndex) {
    var _a;

    var memory = this._allocateMemory('double');

    this._checkError((_a = this._EN).getbasedemand.apply(_a, __spreadArrays([nodeIndex, demandIndex], memory)));

    return this._getValue(memory[0], 'double');
  };

  NodalDemandFunctions.prototype.getDemandIndex = function (nodeIndex, demandName) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).getdemandindex.apply(_a, __spreadArrays([nodeIndex, demandName], memory)));

    return this._getValue(memory[0], 'int');
  };

  NodalDemandFunctions.prototype.getDemandModel = function () {
    var _a;

    var memory = this._allocateMemory('int', 'double', 'double', 'double');

    this._checkError((_a = this._EN).getdemandmodel.apply(_a, memory));

    return {
      type: this._getValue(memory[0], 'int'),
      pmin: this._getValue(memory[1], 'double'),
      preq: this._getValue(memory[2], 'double'),
      pexp: this._getValue(memory[3], 'double')
    };
  };

  NodalDemandFunctions.prototype.getDemandName = function (nodeIndex, demandIndex) {
    var _a;

    var memory = this._allocateMemory('char');

    this._checkError((_a = this._EN).getdemandname.apply(_a, __spreadArrays([nodeIndex, demandIndex], memory)));

    return this._getValue(memory[0], 'char');
  };

  NodalDemandFunctions.prototype.getDemandPattern = function (nodeIndex, demandIndex) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).getdemandpattern.apply(_a, __spreadArrays([nodeIndex, demandIndex], memory)));

    return this._getValue(memory[0], 'int');
  };

  NodalDemandFunctions.prototype.getNumberOfDemands = function (nodeIndex) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).getnumdemands.apply(_a, __spreadArrays([nodeIndex], memory)));

    return this._getValue(memory[0], 'int');
  };

  NodalDemandFunctions.prototype.setBaseDemand = function (nodeIndex, demandIndex, baseDemand) {
    this._checkError(this._EN.setbasedemand(nodeIndex, demandIndex, baseDemand));
  };

  NodalDemandFunctions.prototype.setDemandModel = function (type, pmin, preq, pexp) {
    this._checkError(this._EN.setdemandmodel(type, pmin, preq, pexp));
  };

  NodalDemandFunctions.prototype.setDemandName = function (nodeIndex, demandIdx, demandName) {
    this._checkError(this._EN.setdemandname(nodeIndex, demandIdx, demandName));
  };

  NodalDemandFunctions.prototype.setDemandPattern = function (nodeIndex, demandIndex, patIndex) {
    this._checkError(this._EN.setdemandpattern(nodeIndex, demandIndex, patIndex));
  };

  return NodalDemandFunctions;
}();

var NetworkLinkFunctions =
/*#__PURE__*/

/** @class */
function () {
  function NetworkLinkFunctions() {}

  NetworkLinkFunctions.prototype.addLink = function (id, linkType, fromNode, toNode) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).addlink.apply(_a, __spreadArrays([id, linkType, fromNode, toNode], memory)));

    return this._getValue(memory[0], 'int');
  };

  NetworkLinkFunctions.prototype.deleteLink = function (index, actionCode) {
    this._checkError(this._EN.deletelink(index, actionCode));
  };

  NetworkLinkFunctions.prototype.getLinkIndex = function (id) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).getlinkindex.apply(_a, __spreadArrays([id], memory)));

    return this._getValue(memory[0], 'int');
  };

  NetworkLinkFunctions.prototype.getLinkId = function (index) {
    var _a;

    var memory = this._allocateMemory('char');

    this._checkError((_a = this._EN).getlinkid.apply(_a, __spreadArrays([index], memory)));

    return this._getValue(memory[0], 'char');
  };

  NetworkLinkFunctions.prototype.setLinkId = function (index, newid) {
    this._checkError(this._EN.setlinkid(index, newid));
  };

  NetworkLinkFunctions.prototype.getLinkType = function (index) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).getlinktype.apply(_a, __spreadArrays([index], memory)));

    return this._getValue(memory[0], 'int');
  };

  NetworkLinkFunctions.prototype.setLinkType = function (index, linkType, actionCode) {
    // Index is In/Out for setlinktype API
    var memory = this._allocateMemory('int');

    this._instance.setValue(memory[0], index, 'i32');

    this._checkError(this._EN.setlinktype(memory[0], linkType, actionCode));

    return this._getValue(memory[0], 'int');
  };

  NetworkLinkFunctions.prototype.getLinkNodes = function (index) {
    var _a;

    var memory = this._allocateMemory('int', 'int');

    this._checkError((_a = this._EN).getlinknodes.apply(_a, __spreadArrays([index], memory)));

    return {
      node1: this._getValue(memory[0], 'int'),
      node2: this._getValue(memory[1], 'int')
    };
  };

  NetworkLinkFunctions.prototype.setLinkNodes = function (index, node1, node2) {
    this._checkError(this._EN.setlinknodes(index, node1, node2));
  };

  NetworkLinkFunctions.prototype.getLinkValue = function (index, property) {
    var _a;

    var memory = this._allocateMemory('double');

    this._checkError((_a = this._EN).getlinkvalue.apply(_a, __spreadArrays([index, property], memory)));

    return this._getValue(memory[0], 'double');
  };

  NetworkLinkFunctions.prototype.setLinkValue = function (index, property, value) {
    this._checkError(this._EN.setlinkvalue(index, property, value));
  };

  NetworkLinkFunctions.prototype.setPipeData = function (index, length, diam, rough, mloss) {
    this._checkError(this._EN.setpipedata(index, length, diam, rough, mloss));
  };

  NetworkLinkFunctions.prototype.getPumpType = function (index) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).getpumptype.apply(_a, __spreadArrays([index], memory)));

    return this._getValue(memory[0], 'int');
  };

  NetworkLinkFunctions.prototype.getHeadCurveIndex = function (linkIndex) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).getheadcurveindex.apply(_a, __spreadArrays([linkIndex], memory)));

    return this._getValue(memory[0], 'int');
  };

  NetworkLinkFunctions.prototype.setHeadCurveIndex = function (linkIndex, curveIndex) {
    this._checkError(this._EN.setheadcurveindex(linkIndex, curveIndex));
  };

  NetworkLinkFunctions.prototype.getVertexCount = function (index) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).getvertexcount.apply(_a, __spreadArrays([index], memory)));

    return this._getValue(memory[0], 'int');
  };

  NetworkLinkFunctions.prototype.getVertex = function (index, vertex) {
    var _a;

    var memory = this._allocateMemory('double', 'double');

    this._checkError((_a = this._EN).getvertex.apply(_a, __spreadArrays([index, vertex], memory)));

    return {
      x: this._getValue(memory[0], 'double'),
      y: this._getValue(memory[1], 'double')
    };
  };

  NetworkLinkFunctions.prototype.setVertices = function (index, x, y) {
    if (x.length !== y.length) {
      throw new Error("X and Y vertex arrays must have the same length - X length: " + x.length + ", Y length " + y.length);
    }

    var xPtr = this._allocateMemoryForArray(x);

    var yPtr = this._allocateMemoryForArray(y);

    this._checkError(this._EN.setvertices(index, xPtr, yPtr, x.length)); // Free memory


    this._instance._free(xPtr);

    this._instance._free(yPtr);
  };

  return NetworkLinkFunctions;
}();

var TimePatternFunctions =
/*#__PURE__*/

/** @class */
function () {
  function TimePatternFunctions() {}

  TimePatternFunctions.prototype.addPattern = function (id) {
    this._checkError(this._EN.addpattern(id));
  };

  TimePatternFunctions.prototype.deletePattern = function (index) {
    this._checkError(this._EN.deletepattern(index));
  };

  TimePatternFunctions.prototype.getPatternIndex = function (id) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).getpatternindex.apply(_a, __spreadArrays([id], memory)));

    return this._getValue(memory[0], 'int');
  };

  TimePatternFunctions.prototype.getPatternId = function (index) {
    var _a;

    var memory = this._allocateMemory('char');

    this._checkError((_a = this._EN).getpatternid.apply(_a, __spreadArrays([index], memory)));

    return this._getValue(memory[0], 'char');
  };

  TimePatternFunctions.prototype.setPatternId = function (index, id) {
    this._checkError(this._EN.setpatternid(index, id));
  };

  TimePatternFunctions.prototype.getPatternLength = function (index) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).getpatternlen.apply(_a, __spreadArrays([index], memory)));

    return this._getValue(memory[0], 'int');
  };

  TimePatternFunctions.prototype.getPatternValue = function (index, period) {
    var _a;

    var memory = this._allocateMemory('double');

    this._checkError((_a = this._EN).getpatternvalue.apply(_a, __spreadArrays([index, period], memory)));

    return this._getValue(memory[0], 'double');
  };

  TimePatternFunctions.prototype.setPatternValue = function (index, period, value) {
    this._checkError(this._EN.setpatternvalue(index, period, value));
  };

  TimePatternFunctions.prototype.getAveragePatternValue = function (index) {
    var _a;

    var memory = this._allocateMemory('double');

    this._checkError((_a = this._EN).getaveragepatternvalue.apply(_a, __spreadArrays([index], memory)));

    return this._getValue(memory[0], 'double');
  };

  TimePatternFunctions.prototype.setPattern = function (index, values) {
    var valuesPtr = this._allocateMemoryForArray(values);

    this._checkError(this._EN.setpattern(index, valuesPtr, values.length)); // Free memory


    this._instance._free(valuesPtr);
  };

  return TimePatternFunctions;
}();

var DataCurveFunctions =
/*#__PURE__*/

/** @class */
function () {
  function DataCurveFunctions() {}

  DataCurveFunctions.prototype.addCurve = function (id) {
    this._checkError(this._EN.addcurve(id));
  };

  DataCurveFunctions.prototype.deleteCurve = function (index) {
    this._checkError(this._EN.deletecurve(index));
  };

  DataCurveFunctions.prototype.getCurveIndex = function (id) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).getcurveindex.apply(_a, __spreadArrays([id], memory)));

    return this._getValue(memory[0], 'int');
  };

  DataCurveFunctions.prototype.getCurveId = function (index) {
    var _a;

    var memory = this._allocateMemory('char');

    this._checkError((_a = this._EN).getcurveid.apply(_a, __spreadArrays([index], memory)));

    return this._getValue(memory[0], 'char');
  };

  DataCurveFunctions.prototype.setCurveId = function (index, id) {
    this._checkError(this._EN.setcurveid(index, id));
  };

  DataCurveFunctions.prototype.getCurveLenth = function (index) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).getcurvelen.apply(_a, __spreadArrays([index], memory)));

    return this._getValue(memory[0], 'int');
  };

  DataCurveFunctions.prototype.getCurveType = function (index) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).getcurvetype.apply(_a, __spreadArrays([index], memory)));

    return this._getValue(memory[0], 'int');
  };

  DataCurveFunctions.prototype.getCurveValue = function (curveIndex, pointIndex) {
    var _a;

    var memory = this._allocateMemory('double', 'double');

    this._checkError((_a = this._EN).getcurvevalue.apply(_a, __spreadArrays([curveIndex, pointIndex], memory)));

    return {
      x: this._getValue(memory[0], 'double'),
      y: this._getValue(memory[1], 'double')
    };
  };

  DataCurveFunctions.prototype.setCurveValue = function (curveIndex, pointIndex, x, y) {
    this._checkError(this._EN.setcurvevalue(curveIndex, pointIndex, x, y));
  };

  DataCurveFunctions.prototype.setCurve = function (index, xValues, yValues) {
    if (xValues.length !== yValues.length) {
      throw new Error("X and Y vertex arrays must have the same length - X length: " + xValues.length + ", Y length " + yValues.length);
    }

    var xPtr = this._allocateMemoryForArray(xValues);

    var yPtr = this._allocateMemoryForArray(yValues);

    this._checkError(this._EN.setcurve(index, xPtr, yPtr, xValues.length)); // Free memory


    this._instance._free(xPtr);

    this._instance._free(yPtr);
  };

  return DataCurveFunctions;
}();

var SimpleControlFunctions =
/*#__PURE__*/

/** @class */
function () {
  function SimpleControlFunctions() {}

  SimpleControlFunctions.prototype.addControl = function (type, linkIndex, setting, nodeIndex, level) {
    var _a;

    var memory = this._allocateMemory('int');

    this._checkError((_a = this._EN).addcontrol.apply(_a, __spreadArrays([type, linkIndex, setting, nodeIndex, level], memory)));

    return this._getValue(memory[0], 'int');
  };

  SimpleControlFunctions.prototype.deleteControl = function (index) {
    this._checkError(this._EN.deletecontrol(index));
  };

  SimpleControlFunctions.prototype.getControl = function (index) {
    var _a;

    var memory = this._allocateMemory('int', 'int', 'double', 'int', 'double');

    this._checkError((_a = this._EN).getcontrol.apply(_a, __spreadArrays([index], memory)));

    return {
      type: this._getValue(memory[0], 'int'),
      linkIndex: this._getValue(memory[1], 'int'),
      setting: this._getValue(memory[2], 'double'),
      nodeIndex: this._getValue(memory[3], 'int'),
      level: this._getValue(memory[4], 'double')
    };
  };

  SimpleControlFunctions.prototype.setControl = function (index, type, linkIndex, setting, nodeIndex, level) {
    this._checkError(this._EN.setcontrol(index, type, linkIndex, setting, nodeIndex, level));
  };

  return SimpleControlFunctions;
}();

var RuleBasedControlFunctions =
/*#__PURE__*/

/** @class */
function () {
  function RuleBasedControlFunctions() {}

  RuleBasedControlFunctions.prototype.addRule = function (rule) {
    this._checkError(this._EN.addrule(rule));
  };

  RuleBasedControlFunctions.prototype.deleteRule = function (index) {
    this._checkError(this._EN.deleterule(index));
  };

  RuleBasedControlFunctions.prototype.getRule = function (index) {
    var _a;

    var memory = this._allocateMemory('int', 'int', 'int', 'double');

    this._checkError((_a = this._EN).getrule.apply(_a, __spreadArrays([index], memory)));

    return {
      premiseCount: this._getValue(memory[0], 'int'),
      thenActionCount: this._getValue(memory[1], 'int'),
      elseActionCount: this._getValue(memory[2], 'int'),
      priority: this._getValue(memory[3], 'double')
    };
  };

  RuleBasedControlFunctions.prototype.getRuleId = function (index) {
    var _a;

    var memory = this._allocateMemory('char');

    this._checkError((_a = this._EN).getruleID.apply(_a, __spreadArrays([index], memory)));

    return this._getValue(memory[0], 'char');
  };

  RuleBasedControlFunctions.prototype.getPremise = function (ruleIndex, premiseIndex) {
    var _a;

    var memory = this._allocateMemory('int', 'int', 'int', 'int', 'int', 'int', 'double');

    this._checkError((_a = this._EN).getpremise.apply(_a, __spreadArrays([ruleIndex, premiseIndex], memory)));

    return {
      logop: this._getValue(memory[0], 'int'),
      object: this._getValue(memory[1], 'int'),
      objIndex: this._getValue(memory[2], 'int'),
      variable: this._getValue(memory[3], 'int'),
      relop: this._getValue(memory[4], 'int'),
      status: this._getValue(memory[5], 'int'),
      value: this._getValue(memory[6], 'double')
    };
  };

  RuleBasedControlFunctions.prototype.setPremise = function (ruleIndex, premiseIndex, logop, object, objIndex, variable, relop, status, value) {
    this._checkError(this._EN.setpremise(ruleIndex, premiseIndex, logop, object, objIndex, variable, relop, status, value));
  };

  RuleBasedControlFunctions.prototype.setPremiseIndex = function (ruleIndex, premiseIndex, objIndex) {
    this._checkError(this._EN.setpremiseindex(ruleIndex, premiseIndex, objIndex));
  };

  RuleBasedControlFunctions.prototype.setPremiseStatus = function (ruleIndex, premiseIndex, status) {
    this._checkError(this._EN.setpremisestatus(ruleIndex, premiseIndex, status));
  };

  RuleBasedControlFunctions.prototype.setPremiseValue = function (ruleIndex, premiseIndex, value) {
    this._checkError(this._EN.setpremisevalue(ruleIndex, premiseIndex, value));
  };

  RuleBasedControlFunctions.prototype.getThenAction = function (ruleIndex, actionIndex) {
    var _a;

    var memory = this._allocateMemory('int', 'int', 'double');

    this._checkError((_a = this._EN).getthenaction.apply(_a, __spreadArrays([ruleIndex, actionIndex], memory)));

    return {
      linkIndex: this._getValue(memory[0], 'int'),
      status: this._getValue(memory[1], 'int'),
      setting: this._getValue(memory[2], 'double')
    };
  };

  RuleBasedControlFunctions.prototype.setThenAction = function (ruleIndex, actionIndex, linkIndex, status, setting) {
    this._checkError(this._EN.setthenaction(ruleIndex, actionIndex, linkIndex, status, setting));
  };

  RuleBasedControlFunctions.prototype.getElseAction = function (ruleIndex, actionIndex) {
    var _a;

    var memory = this._allocateMemory('int', 'int', 'double');

    this._checkError((_a = this._EN).getelseaction.apply(_a, __spreadArrays([ruleIndex, actionIndex], memory)));

    return {
      linkIndex: this._getValue(memory[0], 'int'),
      status: this._getValue(memory[1], 'int'),
      setting: this._getValue(memory[2], 'double')
    };
  };

  RuleBasedControlFunctions.prototype.setElseAction = function (ruleIndex, actionIndex, linkIndex, status, setting) {
    this._checkError(this._EN.setelseaction(ruleIndex, actionIndex, linkIndex, status, setting));
  };

  RuleBasedControlFunctions.prototype.setRulePriority = function (index, priority) {
    this._checkError(this._EN.setrulepriority(index, priority));
  };

  return RuleBasedControlFunctions;
}();

var Project =
/*#__PURE__*/

/** @class */
function () {
  function Project(ws) {
    // Implementing function classes
    // Project Functions
    this.open = ProjectFunctions.prototype.open;
    this.close = ProjectFunctions.prototype.close;
    this.runProject = ProjectFunctions.prototype.runProject;
    this.init = ProjectFunctions.prototype.init;
    this.getCount = ProjectFunctions.prototype.getCount;
    this.getTitle = ProjectFunctions.prototype.getTitle;
    this.setTitle = ProjectFunctions.prototype.setTitle;
    this.saveInpFile = ProjectFunctions.prototype.saveInpFile; // Hydraulic Analysis Functions

    this.solveH = HydraulicAnalysisFunctions.prototype.solveH;
    this.useHydFile = HydraulicAnalysisFunctions.prototype.useHydFile;
    this.openH = HydraulicAnalysisFunctions.prototype.openH;
    this.initH = HydraulicAnalysisFunctions.prototype.initH;
    this.runH = HydraulicAnalysisFunctions.prototype.runH;
    this.nextH = HydraulicAnalysisFunctions.prototype.nextH;
    this.saveH = HydraulicAnalysisFunctions.prototype.saveH;
    this.saveHydFile = HydraulicAnalysisFunctions.prototype.saveHydFile;
    this.closeH = HydraulicAnalysisFunctions.prototype.closeH; // Water Quality Analysis Functions

    this.solveQ = WaterQualityAnalysisFunctions.prototype.solveQ;
    this.openQ = WaterQualityAnalysisFunctions.prototype.openQ;
    this.initQ = WaterQualityAnalysisFunctions.prototype.initQ;
    this.runQ = WaterQualityAnalysisFunctions.prototype.runQ;
    this.nextQ = WaterQualityAnalysisFunctions.prototype.nextQ;
    this.stepQ = WaterQualityAnalysisFunctions.prototype.stepQ;
    this.closeQ = WaterQualityAnalysisFunctions.prototype.closeQ; // Reporting Functions

    this.writeLine = ReportingFunctions.prototype.writeLine;
    this.report = ReportingFunctions.prototype.report;
    this.copyReport = ReportingFunctions.prototype.copyReport;
    this.clearReport = ReportingFunctions.prototype.clearReport;
    this.resetReport = ReportingFunctions.prototype.resetReport;
    this.setReport = ReportingFunctions.prototype.setReport;
    this.setStatusReport = ReportingFunctions.prototype.setStatusReport;
    this.getStatistic = ReportingFunctions.prototype.getStatistic;
    this.getResultIndex = ReportingFunctions.prototype.getResultIndex; // Analysis Options Functions

    this.getFlowUnits = AnalysisOptionsFunctions.prototype.getFlowUnits;
    this.getOption = AnalysisOptionsFunctions.prototype.getOption;
    this.getQualityInfo = AnalysisOptionsFunctions.prototype.getQualityInfo;
    this.getQualityType = AnalysisOptionsFunctions.prototype.getQualityType;
    this.getTimeParameter = AnalysisOptionsFunctions.prototype.getTimeParameter;
    this.setFlowUnits = AnalysisOptionsFunctions.prototype.setFlowUnits;
    this.setOption = AnalysisOptionsFunctions.prototype.setOption;
    this.setQualityType = AnalysisOptionsFunctions.prototype.setQualityType;
    this.setTimeParameter = AnalysisOptionsFunctions.prototype.setTimeParameter; //Network Node Functions

    this.addNode = NetworkNodeFunctions.prototype.addNode;
    this.deleteNode = NetworkNodeFunctions.prototype.deleteNode;
    this.getNodeIndex = NetworkNodeFunctions.prototype.getNodeIndex;
    this.getNodeId = NetworkNodeFunctions.prototype.getNodeId;
    this.setNodeId = NetworkNodeFunctions.prototype.setNodeId;
    this.getNodeType = NetworkNodeFunctions.prototype.getNodeType;
    this.getNodeValue = NetworkNodeFunctions.prototype.getNodeValue;
    this.setNodeValue = NetworkNodeFunctions.prototype.setNodeValue;
    this.setJunctionData = NetworkNodeFunctions.prototype.setJunctionData;
    this.setTankData = NetworkNodeFunctions.prototype.setTankData;
    this.getCoordinates = NetworkNodeFunctions.prototype.getCoordinates;
    this.setCoordinates = NetworkNodeFunctions.prototype.setCoordinates; // Nodal Demand Functions

    this.addDemand = NodalDemandFunctions.prototype.addDemand;
    this.deleteDemand = NodalDemandFunctions.prototype.deleteDemand;
    this.getBaseDemand = NodalDemandFunctions.prototype.getBaseDemand;
    this.getDemandIndex = NodalDemandFunctions.prototype.getDemandIndex;
    this.getDemandModel = NodalDemandFunctions.prototype.getDemandModel;
    this.getDemandName = NodalDemandFunctions.prototype.getDemandName;
    this.getDemandPattern = NodalDemandFunctions.prototype.getDemandPattern;
    this.getNumberOfDemands = NodalDemandFunctions.prototype.getNumberOfDemands;
    this.setBaseDemand = NodalDemandFunctions.prototype.setBaseDemand;
    this.setDemandModel = NodalDemandFunctions.prototype.setDemandModel;
    this.setDemandName = NodalDemandFunctions.prototype.setDemandName;
    this.setDemandPattern = NodalDemandFunctions.prototype.setDemandPattern; // Network Link Functions

    this.addLink = NetworkLinkFunctions.prototype.addLink;
    this.deleteLink = NetworkLinkFunctions.prototype.deleteLink;
    this.getLinkIndex = NetworkLinkFunctions.prototype.getLinkIndex;
    this.getLinkId = NetworkLinkFunctions.prototype.getLinkId;
    this.setLinkId = NetworkLinkFunctions.prototype.setLinkId;
    this.getLinkType = NetworkLinkFunctions.prototype.getLinkType;
    this.setLinkType = NetworkLinkFunctions.prototype.setLinkType;
    this.getLinkNodes = NetworkLinkFunctions.prototype.getLinkNodes;
    this.setLinkNodes = NetworkLinkFunctions.prototype.setLinkNodes;
    this.getLinkValue = NetworkLinkFunctions.prototype.getLinkValue;
    this.setLinkValue = NetworkLinkFunctions.prototype.setLinkValue;
    this.setPipeData = NetworkLinkFunctions.prototype.setPipeData;
    this.getPumpType = NetworkLinkFunctions.prototype.getPumpType;
    this.getHeadCurveIndex = NetworkLinkFunctions.prototype.getHeadCurveIndex;
    this.setHeadCurveIndex = NetworkLinkFunctions.prototype.setHeadCurveIndex;
    this.getVertexCount = NetworkLinkFunctions.prototype.getVertexCount;
    this.getVertex = NetworkLinkFunctions.prototype.getVertex;
    this.setVertices = NetworkLinkFunctions.prototype.setVertices; // Time Pattern Functions

    this.addPattern = TimePatternFunctions.prototype.addPattern;
    this.deletePattern = TimePatternFunctions.prototype.deletePattern;
    this.getPatternIndex = TimePatternFunctions.prototype.getPatternIndex;
    this.getPatternId = TimePatternFunctions.prototype.getPatternId;
    this.setPatternId = TimePatternFunctions.prototype.setPatternId;
    this.getPatternLength = TimePatternFunctions.prototype.getPatternLength;
    this.getPatternValue = TimePatternFunctions.prototype.getPatternValue;
    this.setPatternValue = TimePatternFunctions.prototype.setPatternValue;
    this.getAveragePatternValue = TimePatternFunctions.prototype.getAveragePatternValue;
    this.setPattern = TimePatternFunctions.prototype.setPattern; // Data Curve Functions

    this.addCurve = DataCurveFunctions.prototype.addCurve;
    this.deleteCurve = DataCurveFunctions.prototype.deleteCurve;
    this.getCurveIndex = DataCurveFunctions.prototype.getCurveIndex;
    this.getCurveId = DataCurveFunctions.prototype.getCurveId;
    this.setCurveId = DataCurveFunctions.prototype.setCurveId;
    this.getCurveLenth = DataCurveFunctions.prototype.getCurveLenth;
    this.getCurveType = DataCurveFunctions.prototype.getCurveType;
    this.getCurveValue = DataCurveFunctions.prototype.getCurveValue;
    this.setCurveValue = DataCurveFunctions.prototype.setCurveValue;
    this.setCurve = DataCurveFunctions.prototype.setCurve; // Simple Control Functions

    this.addControl = SimpleControlFunctions.prototype.addControl;
    this.deleteControl = SimpleControlFunctions.prototype.deleteControl;
    this.getControl = SimpleControlFunctions.prototype.getControl;
    this.setControl = SimpleControlFunctions.prototype.setControl; // Rule-Based Control Functions

    this.addRule = RuleBasedControlFunctions.prototype.addRule;
    this.deleteRule = RuleBasedControlFunctions.prototype.deleteRule;
    this.getRule = RuleBasedControlFunctions.prototype.getRule;
    this.getRuleId = RuleBasedControlFunctions.prototype.getRuleId;
    this.getPremise = RuleBasedControlFunctions.prototype.getPremise;
    this.setPremise = RuleBasedControlFunctions.prototype.setPremise;
    this.setPremiseIndex = RuleBasedControlFunctions.prototype.setPremiseIndex;
    this.setPremiseStatus = RuleBasedControlFunctions.prototype.setPremiseStatus;
    this.setPremiseValue = RuleBasedControlFunctions.prototype.setPremiseValue;
    this.getThenAction = RuleBasedControlFunctions.prototype.getThenAction;
    this.setThenAction = RuleBasedControlFunctions.prototype.setThenAction;
    this.getElseAction = RuleBasedControlFunctions.prototype.getElseAction;
    this.setElseAction = RuleBasedControlFunctions.prototype.setElseAction;
    this.setRulePriority = RuleBasedControlFunctions.prototype.setRulePriority;
    this._ws = ws;
    this._instance = ws._instance;
    this._EN = new this._ws._instance.Epanet();
  }

  Project.prototype._getValue = function (pointer, type) {
    var value;

    if (type === 'char') {
      value = this._instance.UTF8ToString(pointer);
    } else {
      var size = type === 'int' ? 'i32' : type === 'long' ? 'i64' : 'double';
      value = this._instance.getValue(pointer, size);
    }

    this._instance._free(pointer);

    return value;
  };

  Project.prototype._allocateMemory = function (v1) {
    var _this = this;

    if (typeof v1 != 'string') {
      throw new Error('Method _allocateMemory expected string');
    }

    var types = Array.prototype.slice.call(arguments);
    return types.reduce(function (acc, t) {
      var memsize;

      switch (t) {
        case 'char':
          memsize = 32; //MAXID in EPANET

          break;

        case 'char-title':
          memsize = 80; //TITLELEN in EPANET

          break;

        case 'int':
          memsize = 4;
          break;

        default:
          memsize = 8; //Double

          break;
      }

      var pointer = _this._instance._malloc(memsize);

      return acc.concat(pointer);
    }, []);
  };

  Project.prototype._allocateMemoryForArray = function (arr) {
    var typedArray = new Float64Array(arr);
    var nDataBytes = typedArray.length * typedArray.BYTES_PER_ELEMENT;

    var dataPtr = this._instance._malloc(nDataBytes);

    this._instance.HEAP8.set(new Uint8Array(typedArray.buffer), dataPtr);

    return dataPtr;
  };

  Project.prototype._checkError = function (errorCode) {
    if (errorCode === 0) {
      return;
    } else if (errorCode < 100) {
      console.warn("epanet-js: " + this._ws.getError(errorCode));
      return;
    }

    var errorMsg = this._ws.getError(errorCode);

    throw new Error(errorMsg);
  };

  return Project;
}();

var ActionCodeType;

(function (ActionCodeType) {
  ActionCodeType[ActionCodeType["Unconditional"] = 0] = "Unconditional";
  ActionCodeType[ActionCodeType["Conditional"] = 1] = "Conditional";
})(ActionCodeType || (ActionCodeType = {}));

var ActionCodeType$1 = ActionCodeType;

var AnalysisStatistic;

(function (AnalysisStatistic) {
  AnalysisStatistic[AnalysisStatistic["Iterations"] = 0] = "Iterations";
  AnalysisStatistic[AnalysisStatistic["RelativeError"] = 1] = "RelativeError";
  AnalysisStatistic[AnalysisStatistic["MaxHeadError"] = 2] = "MaxHeadError";
  AnalysisStatistic[AnalysisStatistic["MaxFlowChange"] = 3] = "MaxFlowChange";
  AnalysisStatistic[AnalysisStatistic["MassBalance"] = 4] = "MassBalance";
  AnalysisStatistic[AnalysisStatistic["DeficientNodes"] = 5] = "DeficientNodes";
  AnalysisStatistic[AnalysisStatistic["DemandReduction"] = 6] = "DemandReduction";
})(AnalysisStatistic || (AnalysisStatistic = {}));

var AnalysisStatistic$1 = AnalysisStatistic;

var ControlType;

(function (ControlType) {
  ControlType[ControlType["LowLevel"] = 0] = "LowLevel";
  ControlType[ControlType["HiLevel"] = 1] = "HiLevel";
  ControlType[ControlType["Timer"] = 2] = "Timer";
  ControlType[ControlType["TimeOfDay"] = 3] = "TimeOfDay";
})(ControlType || (ControlType = {}));

var ControlType$1 = ControlType;

var CountType;

(function (CountType) {
  CountType[CountType["NodeCount"] = 0] = "NodeCount";
  CountType[CountType["TankCount"] = 1] = "TankCount";
  CountType[CountType["LinkCount"] = 2] = "LinkCount";
  CountType[CountType["PatCount"] = 3] = "PatCount";
  CountType[CountType["CurveCount"] = 4] = "CurveCount";
  CountType[CountType["ControlCount"] = 5] = "ControlCount";
  CountType[CountType["RuleCount"] = 6] = "RuleCount";
})(CountType || (CountType = {}));

var CountType$1 = CountType;

var CurveType;

(function (CurveType) {
  CurveType[CurveType["VolumeCurve"] = 0] = "VolumeCurve";
  CurveType[CurveType["PumpCurve"] = 1] = "PumpCurve";
  CurveType[CurveType["EfficCurve"] = 2] = "EfficCurve";
  CurveType[CurveType["HlossCurve"] = 3] = "HlossCurve";
  CurveType[CurveType["GenericCurve"] = 4] = "GenericCurve";
})(CurveType || (CurveType = {}));

var CurveType$1 = CurveType;

var DemandModel;

(function (DemandModel) {
  DemandModel[DemandModel["DDA"] = 0] = "DDA";
  DemandModel[DemandModel["PDA"] = 1] = "PDA";
})(DemandModel || (DemandModel = {}));

var DemandModel$1 = DemandModel;

var FlowUnits;

(function (FlowUnits) {
  FlowUnits[FlowUnits["CFS"] = 0] = "CFS";
  FlowUnits[FlowUnits["GPM"] = 1] = "GPM";
  FlowUnits[FlowUnits["MGD"] = 2] = "MGD";
  FlowUnits[FlowUnits["IMGD"] = 3] = "IMGD";
  FlowUnits[FlowUnits["AFD"] = 4] = "AFD";
  FlowUnits[FlowUnits["LPS"] = 5] = "LPS";
  FlowUnits[FlowUnits["LPM"] = 6] = "LPM";
  FlowUnits[FlowUnits["MLD"] = 7] = "MLD";
  FlowUnits[FlowUnits["CMH"] = 8] = "CMH";
  FlowUnits[FlowUnits["CMD"] = 9] = "CMD";
})(FlowUnits || (FlowUnits = {}));

var FlowUnits$1 = FlowUnits;

var HeadLossType;

(function (HeadLossType) {
  HeadLossType[HeadLossType["HW"] = 0] = "HW";
  HeadLossType[HeadLossType["DW"] = 1] = "DW";
  HeadLossType[HeadLossType["CM"] = 2] = "CM";
})(HeadLossType || (HeadLossType = {}));

var HeadLossType$1 = HeadLossType;

var InitHydOption;

(function (InitHydOption) {
  InitHydOption[InitHydOption["NoSave"] = 0] = "NoSave";
  InitHydOption[InitHydOption["Save"] = 1] = "Save";
  InitHydOption[InitHydOption["InitFlow"] = 10] = "InitFlow";
  InitHydOption[InitHydOption["SaveAndInit"] = 11] = "SaveAndInit";
})(InitHydOption || (InitHydOption = {}));

var InitHydOption$1 = InitHydOption;

var LinkProperty;

(function (LinkProperty) {
  LinkProperty[LinkProperty["Diameter"] = 0] = "Diameter";
  LinkProperty[LinkProperty["Length"] = 1] = "Length";
  LinkProperty[LinkProperty["Roughness"] = 2] = "Roughness";
  LinkProperty[LinkProperty["MinorLoss"] = 3] = "MinorLoss";
  LinkProperty[LinkProperty["InitStatus"] = 4] = "InitStatus";
  LinkProperty[LinkProperty["InitSetting"] = 5] = "InitSetting";
  LinkProperty[LinkProperty["KBulk"] = 6] = "KBulk";
  LinkProperty[LinkProperty["KWall"] = 7] = "KWall";
  LinkProperty[LinkProperty["Flow"] = 8] = "Flow";
  LinkProperty[LinkProperty["Velocity"] = 9] = "Velocity";
  LinkProperty[LinkProperty["Headloss"] = 10] = "Headloss";
  LinkProperty[LinkProperty["Status"] = 11] = "Status";
  LinkProperty[LinkProperty["Setting"] = 12] = "Setting";
  LinkProperty[LinkProperty["Energy"] = 13] = "Energy";
  LinkProperty[LinkProperty["LinkQual"] = 14] = "LinkQual";
  LinkProperty[LinkProperty["LinkPattern"] = 15] = "LinkPattern";
  LinkProperty[LinkProperty["PumpState"] = 16] = "PumpState";
  LinkProperty[LinkProperty["PumpEffic"] = 17] = "PumpEffic";
  LinkProperty[LinkProperty["PumpPower"] = 18] = "PumpPower";
  LinkProperty[LinkProperty["PumpHCurve"] = 19] = "PumpHCurve";
  LinkProperty[LinkProperty["PumpECurve"] = 20] = "PumpECurve";
  LinkProperty[LinkProperty["PumpECost"] = 21] = "PumpECost";
  LinkProperty[LinkProperty["PumpEPat"] = 22] = "PumpEPat";
})(LinkProperty || (LinkProperty = {}));

var LinkProperty$1 = LinkProperty;

var LinkStatusType;

(function (LinkStatusType) {
  LinkStatusType[LinkStatusType["Closed"] = 0] = "Closed";
  LinkStatusType[LinkStatusType["Open"] = 1] = "Open";
})(LinkStatusType || (LinkStatusType = {}));

var LinkStatusType$1 = LinkStatusType;

var LinkType;

(function (LinkType) {
  LinkType[LinkType["CVPipe"] = 0] = "CVPipe";
  LinkType[LinkType["Pipe"] = 1] = "Pipe";
  LinkType[LinkType["Pump"] = 2] = "Pump";
  LinkType[LinkType["PRV"] = 3] = "PRV";
  LinkType[LinkType["PSV"] = 4] = "PSV";
  LinkType[LinkType["PBV"] = 5] = "PBV";
  LinkType[LinkType["FCV"] = 6] = "FCV";
  LinkType[LinkType["TCV"] = 7] = "TCV";
  LinkType[LinkType["GPV"] = 8] = "GPV";
})(LinkType || (LinkType = {}));

var LinkType$1 = LinkType;

var MixingModel;

(function (MixingModel) {
  MixingModel[MixingModel["Mix1"] = 0] = "Mix1";
  MixingModel[MixingModel["Mix2"] = 1] = "Mix2";
  MixingModel[MixingModel["FIFO"] = 2] = "FIFO";
  MixingModel[MixingModel["LIFO"] = 3] = "LIFO";
})(MixingModel || (MixingModel = {}));

var MixingModel$1 = MixingModel;

var NodeProperty;

(function (NodeProperty) {
  NodeProperty[NodeProperty["Elevation"] = 0] = "Elevation";
  NodeProperty[NodeProperty["BaseDemand"] = 1] = "BaseDemand";
  NodeProperty[NodeProperty["Pattern"] = 2] = "Pattern";
  NodeProperty[NodeProperty["Emitter"] = 3] = "Emitter";
  NodeProperty[NodeProperty["Initqual"] = 4] = "Initqual";
  NodeProperty[NodeProperty["SourceQual"] = 5] = "SourceQual";
  NodeProperty[NodeProperty["SourcePat"] = 6] = "SourcePat";
  NodeProperty[NodeProperty["SourceType"] = 7] = "SourceType";
  NodeProperty[NodeProperty["TankLevel"] = 8] = "TankLevel";
  NodeProperty[NodeProperty["Demand"] = 9] = "Demand";
  NodeProperty[NodeProperty["Head"] = 10] = "Head";
  NodeProperty[NodeProperty["Pressure"] = 11] = "Pressure";
  NodeProperty[NodeProperty["Quality"] = 12] = "Quality";
  NodeProperty[NodeProperty["SourceMass"] = 13] = "SourceMass";
  NodeProperty[NodeProperty["InitVolume"] = 14] = "InitVolume";
  NodeProperty[NodeProperty["MixModel"] = 15] = "MixModel";
  NodeProperty[NodeProperty["MixZoneVol"] = 16] = "MixZoneVol";
  NodeProperty[NodeProperty["TankDiam"] = 17] = "TankDiam";
  NodeProperty[NodeProperty["MinVolume"] = 18] = "MinVolume";
  NodeProperty[NodeProperty["VolCurve"] = 19] = "VolCurve";
  NodeProperty[NodeProperty["MinLevel"] = 20] = "MinLevel";
  NodeProperty[NodeProperty["MaxLevel"] = 21] = "MaxLevel";
  NodeProperty[NodeProperty["MixFraction"] = 22] = "MixFraction";
  NodeProperty[NodeProperty["TankKBulk"] = 23] = "TankKBulk";
  NodeProperty[NodeProperty["TankVolume"] = 24] = "TankVolume";
  NodeProperty[NodeProperty["MaxVolume"] = 25] = "MaxVolume";
  NodeProperty[NodeProperty["CanOverFlow"] = 26] = "CanOverFlow";
  NodeProperty[NodeProperty["DemandDeficit"] = 27] = "DemandDeficit";
})(NodeProperty || (NodeProperty = {}));

var NodeProperty$1 = NodeProperty;

var NodeType;

(function (NodeType) {
  NodeType[NodeType["Junction"] = 0] = "Junction";
  NodeType[NodeType["Reservoir"] = 1] = "Reservoir";
  NodeType[NodeType["Tank"] = 2] = "Tank";
})(NodeType || (NodeType = {}));

var NodeType$1 = NodeType;

var ObjectType;

(function (ObjectType) {
  ObjectType[ObjectType["Node"] = 0] = "Node";
  ObjectType[ObjectType["Link"] = 1] = "Link";
  ObjectType[ObjectType["TimePat"] = 2] = "TimePat";
  ObjectType[ObjectType["Curve"] = 3] = "Curve";
  ObjectType[ObjectType["Control"] = 4] = "Control";
  ObjectType[ObjectType["Rule"] = 5] = "Rule";
})(ObjectType || (ObjectType = {}));

var ObjectType$1 = ObjectType;

var Option;

(function (Option) {
  Option[Option["Trials"] = 0] = "Trials";
  Option[Option["Accuracy"] = 1] = "Accuracy";
  Option[Option["Tolerance"] = 2] = "Tolerance";
  Option[Option["Emitexpon"] = 3] = "Emitexpon";
  Option[Option["DemandMult"] = 4] = "DemandMult";
  Option[Option["HeadError"] = 5] = "HeadError";
  Option[Option["FlowChange"] = 6] = "FlowChange";
  Option[Option["HeadlossForm"] = 7] = "HeadlossForm";
  Option[Option["GlobalEffic"] = 8] = "GlobalEffic";
  Option[Option["GlobalPrice"] = 9] = "GlobalPrice";
  Option[Option["GlobalPattern"] = 10] = "GlobalPattern";
  Option[Option["DemandCharge"] = 11] = "DemandCharge";
  Option[Option["SpGravity"] = 12] = "SpGravity";
  Option[Option["SpViscos"] = 13] = "SpViscos";
  Option[Option["Unbalanced"] = 14] = "Unbalanced";
  Option[Option["CheckFreq"] = 15] = "CheckFreq";
  Option[Option["MaxCheck"] = 16] = "MaxCheck";
  Option[Option["DampLimit"] = 17] = "DampLimit";
  Option[Option["SpDiffus"] = 18] = "SpDiffus";
  Option[Option["BulkOrder"] = 19] = "BulkOrder";
  Option[Option["WallOrder"] = 20] = "WallOrder";
  Option[Option["TankOrder"] = 21] = "TankOrder";
  Option[Option["ConcenLimit"] = 22] = "ConcenLimit";
})(Option || (Option = {}));

var Option$1 = Option;

var PumpStateType;

(function (PumpStateType) {
  PumpStateType[PumpStateType["PumpXHead"] = 0] = "PumpXHead";
  PumpStateType[PumpStateType["PumpClosed"] = 2] = "PumpClosed";
  PumpStateType[PumpStateType["PumpOpen"] = 3] = "PumpOpen";
  PumpStateType[PumpStateType["PumpXFlow"] = 5] = "PumpXFlow";
})(PumpStateType || (PumpStateType = {}));

var PumpStateType$1 = PumpStateType;

var PumpType;

(function (PumpType) {
  PumpType[PumpType["ConstHP"] = 0] = "ConstHP";
  PumpType[PumpType["PowerFunc"] = 1] = "PowerFunc";
  PumpType[PumpType["Custom"] = 2] = "Custom";
  PumpType[PumpType["NoCurve"] = 3] = "NoCurve";
})(PumpType || (PumpType = {}));

var PumpType$1 = PumpType;

var QualityType;

(function (QualityType) {
  QualityType[QualityType["None"] = 0] = "None";
  QualityType[QualityType["Chem"] = 1] = "Chem";
  QualityType[QualityType["Age"] = 2] = "Age";
  QualityType[QualityType["Trace"] = 3] = "Trace";
})(QualityType || (QualityType = {}));

var QualityType$1 = QualityType;

var RuleObject;

(function (RuleObject) {
  RuleObject[RuleObject["Node"] = 6] = "Node";
  RuleObject[RuleObject["Link"] = 7] = "Link";
  RuleObject[RuleObject["System"] = 8] = "System";
})(RuleObject || (RuleObject = {}));

var RuleObject$1 = RuleObject;

var RuleOperator;

(function (RuleOperator) {
  RuleOperator[RuleOperator["EqualTo"] = 0] = "EqualTo";
  RuleOperator[RuleOperator["NotEqualTo"] = 1] = "NotEqualTo";
  RuleOperator[RuleOperator["LessOrEqualTo"] = 2] = "LessOrEqualTo";
  RuleOperator[RuleOperator["GreaterOrEqualTo"] = 3] = "GreaterOrEqualTo";
  RuleOperator[RuleOperator["LessThan"] = 4] = "LessThan";
  RuleOperator[RuleOperator["GreaterThan"] = 5] = "GreaterThan";
  RuleOperator[RuleOperator["Is"] = 6] = "Is";
  RuleOperator[RuleOperator["Not"] = 7] = "Not";
  RuleOperator[RuleOperator["Below"] = 8] = "Below";
  RuleOperator[RuleOperator["Above"] = 9] = "Above";
})(RuleOperator || (RuleOperator = {}));

var RuleOperator$1 = RuleOperator;

var RuleStatus;

(function (RuleStatus) {
  RuleStatus[RuleStatus["IsOpen"] = 1] = "IsOpen";
  RuleStatus[RuleStatus["IsClosed"] = 2] = "IsClosed";
  RuleStatus[RuleStatus["IsActive"] = 3] = "IsActive";
})(RuleStatus || (RuleStatus = {}));

var RuleStatus$1 = RuleStatus;

var RuleVariable;

(function (RuleVariable) {
  RuleVariable[RuleVariable["Demand"] = 0] = "Demand";
  RuleVariable[RuleVariable["Head"] = 1] = "Head";
  RuleVariable[RuleVariable["Grade"] = 2] = "Grade";
  RuleVariable[RuleVariable["Level"] = 3] = "Level";
  RuleVariable[RuleVariable["Pressure"] = 4] = "Pressure";
  RuleVariable[RuleVariable["Flow"] = 5] = "Flow";
  RuleVariable[RuleVariable["Status"] = 6] = "Status";
  RuleVariable[RuleVariable["Setting"] = 7] = "Setting";
  RuleVariable[RuleVariable["Power"] = 8] = "Power";
  RuleVariable[RuleVariable["Time"] = 9] = "Time";
  RuleVariable[RuleVariable["ClockTime"] = 10] = "ClockTime";
  RuleVariable[RuleVariable["FillTime"] = 11] = "FillTime";
  RuleVariable[RuleVariable["DrainTime"] = 12] = "DrainTime";
})(RuleVariable || (RuleVariable = {}));

var RuleVariable$1 = RuleVariable;

var SizeLimits;

(function (SizeLimits) {
  SizeLimits[SizeLimits["MaxId"] = 31] = "MaxId";
  SizeLimits[SizeLimits["MaxMsg"] = 255] = "MaxMsg";
})(SizeLimits || (SizeLimits = {}));

var SizeLimits$1 = SizeLimits;

var SourceType;

(function (SourceType) {
  SourceType[SourceType["Concen"] = 0] = "Concen";
  SourceType[SourceType["Mass"] = 1] = "Mass";
  SourceType[SourceType["SetPoint"] = 2] = "SetPoint";
  SourceType[SourceType["FlowPaced"] = 3] = "FlowPaced";
})(SourceType || (SourceType = {}));

var SourceType$1 = SourceType;

var StatisticType;

(function (StatisticType) {
  StatisticType[StatisticType["Series"] = 0] = "Series";
  StatisticType[StatisticType["Average"] = 1] = "Average";
  StatisticType[StatisticType["Minimum"] = 2] = "Minimum";
  StatisticType[StatisticType["Maximum"] = 3] = "Maximum";
  StatisticType[StatisticType["Range"] = 4] = "Range";
})(StatisticType || (StatisticType = {}));

var StatisticType$1 = StatisticType;

var StatusReport;

(function (StatusReport) {
  StatusReport[StatusReport["NoReport"] = 0] = "NoReport";
  StatusReport[StatusReport["NormalReport"] = 1] = "NormalReport";
  StatusReport[StatusReport["FullReport"] = 2] = "FullReport";
})(StatusReport || (StatusReport = {}));

var StatusReport$1 = StatusReport;

var TimeParameter;

(function (TimeParameter) {
  TimeParameter[TimeParameter["Duration"] = 0] = "Duration";
  TimeParameter[TimeParameter["HydStep"] = 1] = "HydStep";
  TimeParameter[TimeParameter["QualStep"] = 2] = "QualStep";
  TimeParameter[TimeParameter["PatternStep"] = 3] = "PatternStep";
  TimeParameter[TimeParameter["PatternStart"] = 4] = "PatternStart";
  TimeParameter[TimeParameter["ReportStep"] = 5] = "ReportStep";
  TimeParameter[TimeParameter["ReportStart"] = 6] = "ReportStart";
  TimeParameter[TimeParameter["RuleStep"] = 7] = "RuleStep";
  TimeParameter[TimeParameter["Statistic"] = 8] = "Statistic";
  TimeParameter[TimeParameter["Periods"] = 9] = "Periods";
  TimeParameter[TimeParameter["StartTime"] = 10] = "StartTime";
  TimeParameter[TimeParameter["HTime"] = 11] = "HTime";
  TimeParameter[TimeParameter["QTime"] = 12] = "QTime";
  TimeParameter[TimeParameter["HaltFlag"] = 13] = "HaltFlag";
  TimeParameter[TimeParameter["NextEvent"] = 14] = "NextEvent";
  TimeParameter[TimeParameter["NextEventTank"] = 15] = "NextEventTank";
})(TimeParameter || (TimeParameter = {}));

var TimeParameter$1 = TimeParameter;

var NodeResultTypes;

(function (NodeResultTypes) {
  NodeResultTypes[NodeResultTypes["Demand"] = 0] = "Demand";
  NodeResultTypes[NodeResultTypes["Head"] = 1] = "Head";
  NodeResultTypes[NodeResultTypes["Pressure"] = 2] = "Pressure";
  NodeResultTypes[NodeResultTypes["WaterQuality"] = 3] = "WaterQuality";
})(NodeResultTypes || (NodeResultTypes = {}));

var LinkResultTypes;

(function (LinkResultTypes) {
  LinkResultTypes[LinkResultTypes["Flow"] = 0] = "Flow";
  LinkResultTypes[LinkResultTypes["Velocity"] = 1] = "Velocity";
  LinkResultTypes[LinkResultTypes["Headloss"] = 2] = "Headloss";
  LinkResultTypes[LinkResultTypes["AvgWaterQuality"] = 3] = "AvgWaterQuality";
  LinkResultTypes[LinkResultTypes["Status"] = 4] = "Status";
  LinkResultTypes[LinkResultTypes["Setting"] = 5] = "Setting";
  LinkResultTypes[LinkResultTypes["ReactionRate"] = 6] = "ReactionRate";
  LinkResultTypes[LinkResultTypes["Friction"] = 7] = "Friction";
})(LinkResultTypes || (LinkResultTypes = {}));

var idBytes = 32;
function readBinary(results) {
  var view1 = new DataView(results.buffer);
  var prolog = {
    nodeCount: view1.getInt32(8, true),
    resAndTankCount: view1.getInt32(12, true),
    linkCount: view1.getInt32(16, true),
    pumpCount: view1.getInt32(20, true),
    valveCount: view1.getInt32(24, true),
    reportingPeriods: view1.getInt32(results.byteLength - 12, true)
  };
  var offsetNodeIds = 884;
  var offsetLinkIds = offsetNodeIds + idBytes * prolog.nodeCount;
  var offsetLinkTypes = offsetNodeIds + 32 * prolog.nodeCount + 40 * prolog.linkCount;
  var offsetNodeIndexes = offsetNodeIds + 32 * prolog.nodeCount + 44 * prolog.linkCount;
  var offsetResults = offsetNodeIds + 36 * prolog.nodeCount + 52 * prolog.linkCount + 8 * prolog.resAndTankCount + 28 * prolog.pumpCount + 4;
  var nodeIds = getIds(offsetNodeIds, prolog.nodeCount, view1);
  var nodeTypes = getNodeTypes(offsetNodeIndexes, prolog.nodeCount, prolog.resAndTankCount, view1);
  var linkIds = getIds(offsetLinkIds, prolog.linkCount, view1);
  var linkTypes = getLinkTypes(offsetLinkTypes, prolog.linkCount, view1);

  var nodes = __spreadArrays(Array(prolog.nodeCount)).map(function (_, i) {
    return getNodeResults(prolog, offsetResults, i, view1, nodeIds[i], nodeTypes[i]);
  });

  var links = __spreadArrays(Array(prolog.linkCount)).map(function (_, i) {
    return getLinkResults(prolog, offsetResults, i, view1, linkIds[i], linkTypes[i]);
  });

  var data = {
    prolog: prolog,
    results: {
      nodes: nodes,
      links: links
    }
  };
  return data;
}

var getIds = function getIds(offset, count, dataView) {
  var ids = [];
  forEachIndex(count, function (index) {
    var arrayBuffer = dataView.buffer.slice(offset + idBytes * index, offset + idBytes * index + idBytes);
    ids.push(stringFrom(arrayBuffer));
  });
  return ids;
};

var getNodeTypes = function getNodeTypes(offset, nodeCount, resAndTankCount, dataView) {
  var types = [];

  var _a = getResAndTanksData(offset, resAndTankCount, dataView),
      resAndTankIndexes = _a[0],
      resAndTankAreas = _a[1];

  forEachIndex(nodeCount, function (index) {
    if (!resAndTankIndexes.includes(index)) {
      types.push(NodeType$1.Junction);
      return;
    }

    if (resAndTankAreas[resAndTankIndexes.indexOf(index)] === 0.0) {
      types.push(NodeType$1.Reservoir);
      return;
    }

    types.push(NodeType$1.Tank);
  });
  return types;
};

var getResAndTanksData = function getResAndTanksData(offsetNodeIndexes, count, dataView) {
  var indexes = [];
  var areas = [];
  var offsetAreas = offsetNodeIndexes + 4 * count;
  forEachIndex(count, function (index) {
    var nodeIndex = dataView.getInt32(offsetNodeIndexes + 4 * index, true);
    indexes.push(nodeIndex - 1);
    areas.push(dataView.getFloat32(offsetAreas + 4 * index, true));
  });
  return [indexes, areas];
};

var getLinkTypes = function getLinkTypes(offset, count, dataView) {
  var types = [];
  forEachIndex(count, function (index) {
    var position = offset + 4 * index;
    var type = dataView.getInt32(position, true);
    types.push(type);
  });
  return types;
};

var getNodeResults = function getNodeResults(prolog, offsetResults, nodeIndex, dataView, id, type) {
  var nodeResults = {
    id: id,
    type: type,
    demand: [],
    head: [],
    pressure: [],
    waterQuality: []
  };
  var result = ['demand', 'head', 'pressure', 'waterQuality'].reduce(function (map, obj, i) {
    var _a;

    return _assign(_assign({}, map), (_a = {}, _a[obj] = getResultByteOffSet(prolog, offsetResults, true, nodeIndex, i).map(function (x) {
      return dataView.getFloat32(x, true);
    }), _a));
  }, nodeResults);
  return result;
};

var getLinkResults = function getLinkResults(prolog, offsetResults, linkIndex, dataView, id, type) {
  var linkResults = {
    id: id,
    type: type,
    flow: [],
    velocity: [],
    headloss: [],
    avgWaterQuality: [],
    status: [],
    setting: [],
    reactionRate: [],
    friction: []
  };
  var result = ['flow', 'velocity', 'headloss', 'avgWaterQuality', 'status', 'setting', 'reactionRate', 'friction'].reduce(function (map, obj, i) {
    var _a;

    return _assign(_assign({}, map), (_a = {}, _a[obj] = getResultByteOffSet(prolog, offsetResults, false, linkIndex, i).map(function (x) {
      return dataView.getFloat32(x, true);
    }), _a));
  }, linkResults);
  return result;
};

var getResultByteOffSet = function getResultByteOffSet(prolog, offsetResults, isNode, objIndex, resultType) {
  var linkResultOffset = isNode ? 0 : 16 * prolog.nodeCount;
  var typeCount = isNode ? prolog.nodeCount : prolog.linkCount;
  var resultSize = 16 * prolog.nodeCount + 32 * prolog.linkCount;

  var answer = __spreadArrays(Array(prolog.reportingPeriods)).map(function (_, i) {
    return offsetResults + resultSize * i + linkResultOffset + 4 * objIndex + 4 * resultType * typeCount;
  });

  return answer;
};

var forEachIndex = function forEachIndex(count, callback) {
  for (var i = 0; i < count; ++i) {
    callback(i);
  }
};

var stringFrom = function stringFrom(arrayBuffer) {
  var array = new Uint8Array(arrayBuffer);
  var arrayNumber = Array.from(array).filter(function (o) {
    return o > 0;
  });
  return String.fromCharCode.apply(null, arrayNumber);
};

exports.ActionCodeType = ActionCodeType$1;
exports.AnalysisStatistic = AnalysisStatistic$1;
exports.ControlType = ControlType$1;
exports.CountType = CountType$1;
exports.CurveType = CurveType$1;
exports.DemandModel = DemandModel$1;
exports.FlowUnits = FlowUnits$1;
exports.HeadLossType = HeadLossType$1;
exports.InitHydOption = InitHydOption$1;
exports.LinkProperty = LinkProperty$1;
exports.LinkStatusType = LinkStatusType$1;
exports.LinkType = LinkType$1;
exports.MixingModel = MixingModel$1;
exports.NodeProperty = NodeProperty$1;
exports.NodeType = NodeType$1;
exports.ObjectType = ObjectType$1;
exports.Option = Option$1;
exports.Project = Project;
exports.PumpStateType = PumpStateType$1;
exports.PumpType = PumpType$1;
exports.QualityType = QualityType$1;
exports.RuleObject = RuleObject$1;
exports.RuleOperator = RuleOperator$1;
exports.RuleStatus = RuleStatus$1;
exports.RuleVariable = RuleVariable$1;
exports.SizeLimits = SizeLimits$1;
exports.SourceType = SourceType$1;
exports.StatisticType = StatisticType$1;
exports.StatusReport = StatusReport$1;
exports.TimeParameter = TimeParameter$1;
exports.Workspace = Workspace;
exports.readBinary = readBinary;
//# sourceMappingURL=epanet-js.cjs.development.js.map

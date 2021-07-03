export interface IQServerPolicyReportResult {
  reportTime:  number;
  reportTitle: string;
  commitHash:  string;
  initiator:   string;
  application: Application;
  counts:      Counts;
  components:  Component[];
}

export interface Application {
  id:              string;
  publicId:        string;
  name:            string;
  organizationId:  string;
  contactUserName: string;
}

export interface Component {
  hash:                string;
  matchState:          string;
  componentIdentifier: ComponentIdentifier;
  packageUrl:          string;
  proprietary:         boolean;
  pathnames:           string[];
  dependencyData?:      DependencyData;
  violations:          Violation[];
  displayName?:        string;
}

export interface ComponentIdentifier {
  format:      string;
  coordinates: Coordinates;
}

export interface Coordinates {
  artifactId: string;
  classifier: string;
  extension:  string;
  groupId:    string;
  version:    string;
}

export interface DependencyData {
  directDependency:      boolean;
  innerSource:           boolean;
  innerSourceData?:      InnerSourceDatum[];
  parentComponentPurls?: string[];
}

export interface InnerSourceDatum {
  ownerApplicationName:      string;
  ownerApplicationId:        string;
  innerSourceComponentPurl?: string;
}

export interface Violation {
  policyId:             string;
  policyName:           string;
  policyThreatCategory: string;
  policyThreatLevel:    number;
  policyViolationId:    string;
  waived:               boolean;
  grandfathered:        boolean;
  constraints:          Constraint[];
}

export interface Constraint {
  constraintId:   string;
  constraintName: string;
  conditions:     Condition[];
}

export interface Condition {
  conditionSummary: string;
  conditionReason:  string;
}

export interface Counts {
  partiallyMatchedComponentCount:    number;
  exactlyMatchedComponentCount:      number;
  totalComponentCount:               number;
  grandfatheredPolicyViolationCount: number;
}

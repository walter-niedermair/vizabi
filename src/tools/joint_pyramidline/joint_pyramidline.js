/*!
 * VIZABI AGEPYRAMID
 */

import * as utils from 'base/utils';
import Tool from 'base/tool';

import AgePyramidComponent from '../agepyramid/agepyramid-component';
import LCComponent from '../linechart/linechart-component';

import {
  timeslider,
  dialogs,
  buttonlist,
  treemenu
}
from 'components/_index';

//BAR CHART TOOL
var JOINTPyramidLine = Tool.extend('JOINTPyramidLine', {

  /**
   * Initializes the tool (Bar Chart Tool).
   * Executed once before any template is rendered.
   * @param {Object} placeholder Placeholder element for the tool
   * @param {Object} external_model Model as given by the external page
   */
  init: function(placeholder, external_model) {
    
    this.name = "agepyramid";
    
    
    this.template = 
      '<div class="vzb-tool vzb-tool-' + this.name + '">' + 
        '<div class="vzb-tool-stage">' + 
          '<div class="vzb-tool-viz-pyramid">' + 
          '</div>' + 
          '<div class="vzb-tool-viz-line">' + 
          '</div>' + 
          '<div class="vzb-tool-timeslider">' + 
          '</div>' + 
        '</div>' + 
        '<div class="vzb-tool-sidebar">' + 
          '<div class="vzb-tool-dialogs">' + 
          '</div>' +
          '<div class="vzb-tool-buttonlist">' + 
          '</div>' + 
        '</div>' +         
        '<div class="vzb-tool-datanotes vzb-hidden">' + 
        '</div>' + 
        '<div class="vzb-tool-treemenu vzb-hidden">' + 
        '</div>' + 
        '<div class="vzb-tool-datawarning vzb-hidden">' + 
        '</div>' + 
        '<div class="vzb-tool-labels vzb-hidden">' + 
        '</div>' + 
      '</div>';    

    

    //specifying components
    this.components = [{
      component: AgePyramidComponent,
      placeholder: '.vzb-tool-viz-pyramid',
      model: ["state.time", "state.entities", "state.entities_side", "state.entities_stack", "state.entities_age", "state.marker_pyramid", "language"] //pass models to component
    }, {      
      component: LCComponent,
      placeholder: '.vzb-tool-viz-line',
      model: ["state.time", "state.entities", "state.marker_line", "language"]
    }, {
      component: timeslider,
      placeholder: '.vzb-tool-timeslider',
      model: ["state.time", "state.entities", "state.marker"]
    }, {
      component: dialogs,
      placeholder: '.vzb-tool-dialogs',
      model: ['state', 'ui', 'language']
    }, {
      component: buttonlist,
      placeholder: '.vzb-tool-buttonlist',
      model: ['state', 'ui', 'language']
    }, {
      component: treemenu,
      placeholder: '.vzb-tool-treemenu',
      model: ['state.marker', 'language']
    }];

    //constructor is the same as any tool
    this._super(placeholder, external_model);
  }

});

export default JOINTPyramidLine;
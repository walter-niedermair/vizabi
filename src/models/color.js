import * as utils from 'base/utils';
import Hook from 'models/hook';

/*!
 * VIZABI Color Model (hook)
 */

var defaultPalettes = {
  "_continuous": {
    "0": "#B4DE79",
    "50": "#E1CE00",
    "100": "#F77481"
  },
  "_discrete": {
    "0": "#bcfa83",
    "1": "#4cd843",
    "2": "#ff8684",
    "3": "#e83739",
    "4": "#ffb04b",
    "5": "#ff7f00",
    "6": "#f599f5",
    "7": "#c027d4",
    "8": "#f4f459",
    "9": "#d66425",
    "10": "#7fb5ed",
    "11": "#0ab8d8"
  },
  "_default": {
    "_default": "#93daec"
  }
};

var ColorModel = Hook.extend({

  /**
   * Default values for this model
   */
  _defaults: {
    use: "constant",
    which: "_default",
    scaleType: "ordinal",
    syncModels: null,
    palette: {},
    paletteLabels: null,
    allow: {
      //this is almost everything, but not "nominal", so no random strings like "name"
      scales: ["linear", "log", "genericLog", "time", "pow", "ordinal"]
    }
  },

  /**
   * Initializes the color hook
   * @param {Object} values The initial values of this model
   * @param parent A reference to the parent model
   * @param {Object} bind Initial events to bind
   */
  init: function(name, values, parent, bind) {
    var _this = this;
    this._type = "color";
    //TODO: add defaults extend to super
    var defaults = utils.deepClone(this._defaults);
    values = utils.extend(defaults, values);

    this._original_palette = values.palette;

    this._super(name, values, parent, bind);

    this._syncModelReferences = {};
    this._firstLoad = true;
    this._hasDefaultColor = false;

    this.on('hook_change', function() {
      if(_this._readyOnce) return;

      if(_this.palette && Object.keys(_this.palette._data).length!==0) {
        var defaultPalette = _this.getDefaultPalette();
        var currentPalette = _this.getPalette();
        var palette = {};
        //extend partial current palette with default palette and
        //switch current palette elements which equals
        //default palette elments to nonpersistent state
        Object.keys(defaultPalette).map(function(key) {
          if(!currentPalette[key]||defaultPalette[key]==currentPalette[key]) palette[key] = defaultPalette[key];
        });
        _this.set("palette", palette, false, false);
        //rewrite one more time because 'persistent' is ignored when new submodel create
        _this.set("palette", palette, true, false);
      }
    });
  },

  // args: {colorID, shadeID}
  getColorShade: function(args){
    var palette = this.getPalette();

    if(!args) return utils.warn("getColorShade() is missing arguments");

    // if colorID is not given or not found in the palette, replace it with default color
    if(!args.colorID || !palette[args.colorID]) args.colorID = "_default";

    // if the resolved colr value is not an array (has only one shade) -- return it
    if( !utils.isArray(palette[args.colorID]) ) return palette[args.colorID];

    var conceptpropsColor = this.getConceptprops().color;
    var shade = args.shadeID && conceptpropsColor && conceptpropsColor.shades && conceptpropsColor.shades[args.shadeID] ? conceptpropsColor.shades[args.shadeID] : 0;

    return palette[args.colorID][shade];

  },

  /**
   * Get the above constants
   */
  isUserSelectable: function() {
    var conceptpropsColor = this.getConceptprops().color;
    return conceptpropsColor == null || conceptpropsColor.selectable == null || conceptpropsColor.selectable;
  },

  /**
   * Validates a color hook
   */
  validate: function() {
    var _this = this;

    var possibleScales = ["log", "genericLog", "linear", "time", "pow"];
    if(!this.scaleType || (this.use === "indicator" && possibleScales.indexOf(this.scaleType) === -1)) {
      this.scaleType = 'linear';
    }
    if(this.use !== "indicator" && this.scaleType !== "ordinal") {
      this.scaleType = "ordinal";
    }

    // reset palette and scale in the following cases: indicator or scale type changed
    if(this._firstLoad === false && (this.which_1 != this.which || this.scaleType_1 != this.scaleType)) {

      //TODO a hack that kills the scale and palette, it will be rebuild upon getScale request in model.js
      if(this.palette) this.palette._data = {};
      this.scale = null;
    }

    // if there are models to sync: do it on first load or on changing the which
    if(this.syncModels && (this._firstLoad || this._firstLoad === false && this.which_1 != this.which)) {
      this.syncModels.forEach(function(modelName){
        //fetch the model to sync, it's marker and entities
        var model = _this.getClosestModel(modelName);
        var marker = model.isHook()? model._parent : model;
        var entities = marker.getClosestModel(marker.space[0]);

        //save the references here locally
        _this._syncModelReferences[modelName] = {model: model, marker: marker, entities: entities};

        if(_this.use === "property") _this._setSyncModel(model, marker, entities);
      });
    }

    this.which_1 = this.which;
    this.scaleType_1 = this.scaleType;
    this._firstLoad = false;
  },

  _setSyncModel: function(model, marker, entities) {
    if(model == marker){
      /*TODO: when WS will learn to respond correctly to the queries
      outside the same entity domain this can be reduced to
      just {dim: this.which}, without any show part #2103*/
      var conceptProps = this.getConceptprops();
      var newFilter = {dim: null, show: {}};
      if(conceptProps.concept_type == "entity_domain"){
        newFilter.dim = this.which;
        newFilter.show = {};
      }else{
        newFilter.dim = conceptProps.domain;
        newFilter.show["is--" + this.which] = true;
      }
      /*END OF TODO*/
      entities.set(newFilter, false, false);
    }else{
      if(model.use == "property") model.set('which', this.which, false, false);
    }
  },

  getColorlegendMarker: function() {
    return (this._syncModelReferences["marker_colorlegend"]||{})["marker"];
  },

  getColorlegendEntities: function() {
    return (this._syncModelReferences["marker_colorlegend"]||{})["entities"];
  },

  /**
   * set color
   */
  setColor: function(value, pointer) {
    var temp = this.getPalette();
    temp[pointer] = value;
    this.scale.range(utils.values(temp));
    this.palette[pointer] = value;
  },


  /**
   * maps the value to this hook's specifications
   * @param value Original value
   * @returns hooked value
   */
  mapValue: function(value) {
    //if the property value does not exist, supply the _default
    // otherwise the missing value would be added to the domain
    if(this.scale != null && this.use == "property" && this._hasDefaultColor && this.scale.domain().indexOf(value) == -1) value = "_default";
    return this._super(value);
  },


  getDefaultPalette: function() {
      var conceptpropsColor = this.getConceptprops().color;
      var palette;

      if(conceptpropsColor && conceptpropsColor.palette) {
        //specific color palette from hook concept properties
        palette = utils.clone(conceptpropsColor.palette);
      } else if(defaultPalettes[this.which]) {
        //color palette for this.which exists in palette defaults
        palette = utils.clone(defaultPalettes[this.which]);
      } else if(this.use === "constant" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(this.which)) {
        //an explicit hex color constant #abc or #adcdef is provided
        palette = {"_default": this.which};
      } else if(this.use === "indicator") {
        palette = utils.clone(defaultPalettes["_continuous"]);
      } else if(this.use === "property") {
        palette = utils.clone(defaultPalettes["_discrete"]);
      } else {
        palette = utils.clone(defaultPalettes["_default"]);
      }

      return palette;
  },

  _getPaletteLabels: function() {
      var conceptpropsColor = this.getConceptprops().color;
      var paletteLabels = null;

      if(conceptpropsColor && conceptpropsColor.paletteLabels) {
        //specific color palette from hook concept properties
        paletteLabels = utils.clone(conceptpropsColor.paletteLabels);
      }
      return paletteLabels;
  },

  getPaletteLabels: function() {
    return this.paletteLabels.getPlainObject();
  },

  getPalette: function(){
    //rebuild palette if it's empty
    if (!this.palette || Object.keys(this.palette._data).length===0){
      var palette = this.getDefaultPalette();
      this.set("palette", palette, false, false);
      //rewrite one more time because 'persistent' is ignored when new submodel create
      this.set("palette", palette, true, false);
      var paletteLabels = this._getPaletteLabels();
      this.set("paletteLabels", paletteLabels, false, false);
      this.set("paletteLabels", paletteLabels, true, false);
    }

    return this.palette.getPlainObject();
  },

  /**
   * Gets the domain for this hook
   * @returns {Array} domain
   */
  buildScale: function() {
    var _this = this;

    var paletteObject = _this.getPalette();
    var domain = Object.keys(paletteObject);
    var range = utils.values(paletteObject);

    this._hasDefaultColor = domain.indexOf("_default") > -1;

    if(this.scaleType == "time") {

      var timeMdl = this._space.time;
      var limits = timeMdl.splash ?
          {min: timeMdl.parseToUnit(timeMdl.startOrigin), max: timeMdl.parseToUnit(timeMdl.endOrigin)}
          :
          {min: timeMdl.start, max: timeMdl.end};

      var singlePoint = (limits.max - limits.min == 0);

      domain = domain.sort(function(a,b){return a-b});
      range = domain.map(function(m){
        return singlePoint? paletteObject[domain[0]] : paletteObject[m]
      });
      domain = domain.map(function(m){
        return limits.min.valueOf() + m/100 * (limits.max.valueOf() - limits.min.valueOf())
      });

      this.scale = d3.time.scale.utc()
        .domain(domain)
        .range(range)
        .interpolate(d3.interpolateRgb);
      return;
    }

    switch(this.use) {
      case "indicator":
        var limits = this.getLimits(this.which);
        //default domain is based on limits
        limits = [limits.min, limits.max];
        //domain from concept properties can override it if defined
        limits = this.getConceptprops().domain ? this.getConceptprops().domain : limits;

        var singlePoint = (limits[1] - limits[0] == 0);

        domain = domain.sort(function(a,b){return a-b});
        range = domain.map(function(m){
          return singlePoint? paletteObject[domain[0]] : paletteObject[m]
        });
        domain = domain.map(function(m){
          return limits[0] + m/100 * (limits[1] - limits[0])
        });

        var scaleType = (d3.min(domain)<=0 && d3.max(domain)>=0 && this.scaleType === "log")? "genericLog" : this.scaleType;

        if(this.scaleType == "log" || this.scaleType == "genericLog") {
          var s = d3.scale.genericLog()
            .domain(limits)
            .range(limits);
          domain = domain.map(function(d) {
            return s.invert(d)
          });
        }
        this.scale = d3.scale[scaleType || "linear"]()
          .domain(domain)
          .range(range)
          .interpolate(d3.interpolateRgb);
        return;

      default:
        range = range.map(function(m){ return utils.isArray(m)? m[0] : m; });

        this.scale = d3.scale["ordinal"]()
          .domain(domain)
          .range(range);
        return;
    }
  }

});

export default ColorModel;

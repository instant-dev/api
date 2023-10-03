const fs = require('fs');
const path = require('path');

const minimatch = require('minimatch');
const mime = require('mime');

const backgroundValidator = require('../background_validator.js');
const types = require('../types.js');
const { isArray } = require('util');

const DEFAULT_IGNORE = [
  '.*.swp',
  '._*',
  '.DS_Store',
  '.git',
  '.hg',
  '.npmrc',
  '.lock-wscript',
  '.svn',
  '.wafpickle-*',
  'config.gypi',
  'CVS',
  'npm-debug.log'
];

class FunctionParser {

  constructor() {
    this._parsers = Object.keys(this.constructor.parsers).reduce((parsers, lang) => {
      parsers[lang] = new this.constructor.parsers[lang]();
      return parsers;
    }, {});
  }

  getParser (ext) {
    ext = ext.toLowerCase();
    let lang = this.constructor.extensions[ext];
    if (!lang) {
      throw new Error(`No parser found for extension "${ext}"`);
    } else if (!this._parsers[lang]) {
      throw new Error(`No "${lang}" parser available`);
    }
    return this._parsers[lang];
  }

  parseDefinition (pathname, buffer, functionsPath, isStatic, isPreload) {

    isStatic = !!isStatic;
    functionsPath = functionsPath || '';
    functionsPath = (functionsPath && !functionsPath.endsWith('/')) ? `${functionsPath}/` : functionsPath;
    if (!pathname.startsWith(functionsPath)) {
      throw new Error(`Pathname does not start with "${functionsPath}"`);
    }
    let names = pathname.split('/');
    let filename = names.pop();
    let ext = filename.split('.').pop();
    let name = filename.substr(0, filename.length - ext.length - 1);
    let definitionList = [];

    if (isStatic) {
      // Convert index.html -> mydomain.com/
      // But also preserve mydomain.com/index.html
      // Special rules for html files named "index" or "404"
      // Which will create default routes
      let parser = this.getParser('');
      let definition;
      let shouldCreateFileEntry = true;
      if (
        (name === 'index' || name === '404') &&
        (ext === 'htm' || ext === 'html')
      ) {
        if (name === 'index') {
          name = names.join('/').substr(functionsPath.length);
        } else if (name === '404') {
          name = `${names.join('/').substr(functionsPath.length)}:notfound`;
          shouldCreateFileEntry = false; // 404 will trigger 404 anyway
        }
        try {
          definition = parser.parse(
            name,
            buffer.toString(),
            pathname,
            buffer
          );
          definition.pathname = pathname;
        } catch (e) {
          throw new Error(`Static file error (${pathname})\n${e.message}`);
        }
        definitionList.push(definition);
      }
      if (shouldCreateFileEntry) {
        try {
          definition = parser.parse(
            names.concat(filename).join('/').substr(functionsPath.length),
            buffer.toString(),
            pathname,
            buffer
          );
          definition.pathname = pathname;
        } catch (e) {
          throw new Error(`Static file error (${pathname})\n${e.message}`);
        }
        definitionList.push(definition);
      }
    } else {
      let parser = this.getParser(`.${ext}`);
      let suffix;
      if (name === '__main__') {
        name = names.join('/');
      } else if (name === '__notfound__') {
        name = names.join('/');
        suffix = 'notfound';
      } else {
        name = names.concat(name).join('/');
      }
      name = name.substr(functionsPath.length);
      if (name && !name.match(/^([A-Z][A-Z0-9\_\-]*\/)*[A-Z][A-Z0-9\_\-]*$/i)) {
        throw new Error(
          `Invalid function name: ${name} (${filename})\n` +
          `All path segments must be alphanumeric (or -, _) and start with a letter`
        );
      }

      name = name + (suffix ? `:${suffix}` : '');
      let definition;

      try {
        definition = parser.parse(name, buffer.toString(), pathname, buffer);
        definition.pathname = pathname;
      } catch (e) {
        e.message = `Function definition error (${pathname})\n${e.message}`;
        throw e;
      }

      if (isPreload) {
        definition.preload = true;
      }

      definitionList.push(definition);

    }

    definitionList.forEach(definition => {
      let validations = this.constructor.definitionFields;
      Object.keys(validations).forEach(field => {
        let validate = validations[field];
        let value = definition[field];
        if (!validate(value)) {
          throw new Error(
            `Endpoint definition error (${pathname})\n`+
            `Invalid field "${field}", unexpected value: ${JSON.stringify(value)}\n` +
            `\nThis is likely caused by a server misconfiguration.`
          );
        }
      });
    });

    return definitionList;

  }

  readDefinitions (files, functionsPath, definitions, isStatic, isPreload) {
    functionsPath = (functionsPath && !functionsPath.endsWith('/')) ? `${functionsPath}/` : (functionsPath || '');
    return Object.keys(files).reduce((definitions, pathname) => {
      if (functionsPath && !pathname.startsWith(functionsPath)) {
        return definitions;
      }
      let definitionList = this.parseDefinition(pathname, files[pathname], functionsPath, isStatic, isPreload);
      definitionList.forEach(definition => {
        if (definitions[definition.name]) {
          let existingDefinition = definitions[definition.name];
          throw new Error(
            `Endpoint ${definition.name} (${definition.pathname}) was already defined in ${existingDefinition.pathname}\n` +
            (
              existingDefinition.preload
                ? `This file was preloaded as part of a compilation step, it can not be overwritten.\n`
                : ''
            ) +
            (
              isStatic
                ? (!existingDefinition.static && definition.static)
                  ? [
                      `Endpoint functions and static files can not have the same name.`,
                      `This can often be caused when a function is named "__main__" and a static file is name "index",`,
                      `or when a function is named "__notfound__" and a static file is named "404".`
                    ].join('\n')
                  : `Only one static file per directory can have the name "index" or "404".`
                : `If declaring with [dir]/__main__.js, make sure [dir].js isn't a file in the parent directory.`
            )
          );
        }
        definitions[definition.name] = definition;
      });
      return definitions;
    }, definitions || {});
  }

  readFiles (rootPath, functionsPath, dirPath, files, ignore) {
    if (ignore && !Array.isArray(ignore)) {
      throw new Error(`Invalid ignore file, received ${typeof ignore} instead of Array`);
    }
    let ignoreList = (ignore || []).concat(DEFAULT_IGNORE);
    functionsPath = functionsPath || '.';
    dirPath = dirPath || '.';
    files = files || {};
    if (!fs.existsSync(path.join(rootPath, functionsPath, dirPath))) {
      return files;
    } else {
      return fs.readdirSync(path.join(rootPath, functionsPath, dirPath)).reduce((files, filename) => {
        let pathname = path.join(rootPath, functionsPath, dirPath, filename);
        let fullPath = path.join(functionsPath, dirPath, filename);
        let filePath = path.join(dirPath, filename);
        let fullPathNormalized = fullPath.split(path.sep).join('/');
        let isDirectory = fs.statSync(pathname).isDirectory();
        for (let i = 0; i < ignoreList.length; i++) {
          if (minimatch(fullPathNormalized, ignoreList[i], {matchBase: true})) {
            return files;
          }
        }
        if (isDirectory) {
          files = this.readFiles(rootPath, functionsPath, filePath, files, ignore);
        } else {
          files[fullPathNormalized] = fs.readFileSync(pathname);
        }
        return files;
      }, files);
    }
  }

  load (rootPath, functionsPath, staticPath, ignore, preloadFiles) {
    let definitions = {};
    if (preloadFiles && typeof preloadFiles === 'object') {
      definitions = this.readDefinitions(preloadFiles, functionsPath, definitions, false, true);
      definitions = this.readDefinitions(preloadFiles, staticPath, definitions, true, true);
    }
    let functionFiles = this.readFiles(rootPath, functionsPath, null, null, ignore);
    definitions = this.readDefinitions(functionFiles, functionsPath, definitions);
    if (staticPath) {
      let staticFiles = this.readFiles(rootPath, staticPath, null, null, ignore);
      definitions = this.readDefinitions(staticFiles, staticPath, definitions, true);
    }
    return definitions;
  }

}

FunctionParser.parsers = {
  'static' : require('./static/static_parser.js'),
  'nodejs': require('./nodejs/exported_function_parser.js')
};

FunctionParser.commentParsers = {
  'nodejs': require('./nodejs/comment_definition_parser.js')
};

FunctionParser.extensions = {
  '': 'static',
  '.js': 'nodejs',
  '.mjs': 'nodejs',
  '.cjs': 'nodejs'
};

FunctionParser.definitionFields = {
  'name': name => typeof name === 'string',
  'pathname': pathname => typeof pathname === 'string',
  'format': format => {
    return format &&
      typeof format === 'object' &&
      typeof format.language === 'string' &&
      typeof format.inline === 'boolean'
  },
  'description': description => typeof description === 'string',
  'metadata': metadata => typeof metadata === 'object' && metadata !== null,
  'origins': origins => {
    return origins === null || origins === void 0 || Array.isArray(origins);
  },
  'background': background => {
    if (background) {
      return background &&
        typeof background === 'object' &&
        'mode' in background &&
        'value' in background &&
        typeof background.value === 'string' &&
        background.mode in backgroundValidator.modes;
    } else {
      return background === null || background === void 0;
    }
  },
  'streams': streams => {
    return streams === null ||
    FunctionParser.definitionFields['params'](streams);
  },
  'context': context => typeof context === 'object',
  'params': (params, isArraySchema) => {
    return Array.isArray(params) &&
      (
        isArraySchema
          ? params.length === 1
          : true
      ) &&
      params.filter(param => {
        return param &&
          typeof param == 'object' &&
          'name' in param &&
          (param.name || isArraySchema) && // only require name if it's not an array schema
          'description' in param &&
          'type' in param &&
          (
            'defaultMetafield' in param
              ? typeof param.defaultMetafield === 'string'
              : true
          ) &&
          (
            'options' in param
              ? param.options && (typeof param.options === 'object')
              : true
          ) &&
          (
            'schema' in param
              ? (
                (['object', 'array'].indexOf(param.type) !== -1) &&
                FunctionParser.definitionFields['params'](param.schema, param.type === 'array')
              )
              : true
          ) &&
          (
            'alternateSchemas' in param
            ? (
                (['object'].indexOf(param.type) !== -1) &&
                Array.isArray(param.alternateSchemas) &&
                param.alternateSchemas.filter(schema => {
                  return FunctionParser.definitionFields['params'](schema);
                }).length === param.alternateSchemas.length
              )
            : true
          ) &&
          types.list.indexOf(param.type) > -1
      }).length === params.length;
  },
  'returns': returns => {
    return returns &&
      typeof returns === 'object' &&
      'name' in returns &&
      'description' in returns &&
      'type' in returns;
  }
};

module.exports = FunctionParser;

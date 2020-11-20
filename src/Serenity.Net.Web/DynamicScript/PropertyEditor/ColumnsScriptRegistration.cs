﻿using Serenity.ComponentModel;
using Serenity.PropertyGrid;
using System;
using System.Collections.Generic;
using System.Reflection;

namespace Serenity.Web
{
    public class ColumnsScriptRegistration
    {
        public static void RegisterColumnsScripts(IDynamicScriptManager scriptManager, IPropertyItemRegistry registry, IEnumerable<Assembly> assemblies)
        {
            if (scriptManager == null)
                throw new ArgumentNullException(nameof(scriptManager));

            if (assemblies == null)
                throw new ArgumentNullException(nameof(assemblies));

            var scripts = new List<Func<string>>();

            foreach (var assembly in assemblies)
                foreach (var type in assembly.GetTypes())
                {
                    var attr = type.GetCustomAttribute<ColumnsScriptAttribute>();
                    if (attr != null)
                    {
                        var script = new ColumnsScript(attr.Key, type, registry);
                        scriptManager.Register(script);
                        scripts.Add(script.GetScript);
                    }
                }

            scriptManager.Register("ColumnsBundle", new ConcatenatedScript(scripts));
        }
    }
}
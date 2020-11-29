﻿using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using Serenity.Abstractions;
using Serenity.Data;
using System;
using System.Data;
using System.Linq;
using System.Reflection;

namespace Serenity.Services
{
    [HandleServiceException]
    public abstract class ServiceEndpoint : Controller
    {
        private IDbConnection connection;
        private UnitOfWork unitOfWork;
        private IRequestContext context;

        protected override void Dispose(bool disposing)
        {
            if (unitOfWork != null)
            {
                unitOfWork.Dispose();
                unitOfWork = null;
            }

            if (connection != null)
            {
                connection.Dispose();
                connection = null;
            }

            base.Dispose(disposing);
        }

        public override void OnActionExecuting(ActionExecutingContext context)
        {
            var uowParam = context.ActionDescriptor.Parameters.FirstOrDefault(x => x.ParameterType == typeof(IUnitOfWork));
            if (uowParam != null)
            {
                var connectionKey = GetType().GetCustomAttribute<ConnectionKeyAttribute>();
                if (connectionKey == null)
                    throw new ArgumentNullException("connectionKey");

                connection = HttpContext.RequestServices.GetRequiredService<IConnectionFactory>().NewByKey(connectionKey.Value);
                unitOfWork = new UnitOfWork(connection);
                context.ActionArguments[uowParam.Name] = unitOfWork;
                base.OnActionExecuting(context);
                return;
            }

            var cnnParam = context.ActionDescriptor.Parameters.FirstOrDefault(x => x.ParameterType == typeof(IDbConnection));
            if (cnnParam != null)
            {
                var connectionKey = GetType().GetCustomAttribute<ConnectionKeyAttribute>();
                if (connectionKey == null)
                    throw new ArgumentNullException("connectionKey");

                connection = HttpContext.RequestServices.GetRequiredService<IConnectionFactory>().NewByKey(connectionKey.Value);
                context.ActionArguments[cnnParam.Name] = connection;
                base.OnActionExecuting(context);
                return;
            }

            base.OnActionExecuting(context);
        }

        public override void OnActionExecuted(ActionExecutedContext context)
        {
            if (unitOfWork != null)
            {
                try
                {
                    if (context != null && context.Exception != null)
                        unitOfWork.Dispose();
                    else
                        unitOfWork.Commit();
                }
                catch (InvalidOperationException)
                {
                    // if a DDL error occurs transaction might turn into a zombie
                    // and we'll get an error here
                }

                unitOfWork = null;
            }

            if (connection != null)
            {
                connection.Dispose();
                connection = null;
            }

            context.Result = (context.Result as ActionResult) ?? new Result<object>(context.Result);

            base.OnActionExecuted(context);
        }

        protected IRequestContext Context
        {
            get
            {
                if (context == null)
                    context = HttpContext?.RequestServices?.GetRequiredService<IRequestContext>();

                return context;
            }
            set
            {
                if (value == null)
                    throw new ArgumentNullException(nameof(value));

                context = value;
            }
        }

        protected ITwoLevelCache Cache => Context?.Cache;
        protected ITextLocalizer Localizer => Context?.Localizer;
        protected IPermissionService Permissions => Context?.Permissions;
    }
}